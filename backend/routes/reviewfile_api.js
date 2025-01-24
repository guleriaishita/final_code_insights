const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const FileManagementHelper = require('../helpers_S3/file_management');
const axios = require('axios')
const fileManager = new FileManagementHelper();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
  { name: 'files', maxCount: 50 },
  { name: 'compliance', maxCount: 1 },
  { name: 'additionalFiles', maxCount: 20 }
]);

const executePythonScript = async (inputData, tempDir) => {
  try {
    const baseDir = path.join(os.tmpdir(), 'codeinsights');
    await fs.mkdir(baseDir, { recursive: true, mode: 0o755 });
    await fs.mkdir(tempDir, { recursive: true, mode: 0o755 });

    const inputFile = path.join(tempDir, 'input.json');
    const outputFile = path.join(tempDir, 'output.json');
    const processData = {
      ...inputData,
      temp_dir: tempDir
    };

    await fs.writeFile(inputFile, JSON.stringify(processData), 'utf8');
    
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(__dirname, '../util/analyze_files.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        '--input', inputFile,
        '--output', outputFile
      ]);

      let errorData = '';
      pythonProcess.stderr.on('data', data => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', async code => {
        if (code !== 0) {
          reject(new Error(`Python process failed: ${errorData}`));
          return;
        }

        try {
          const resultData = await fs.readFile(outputFile, 'utf8');
          resolve(JSON.parse(resultData));
        } catch (error) {
          reject(new Error(`Failed to read output: ${error.message}`));
        }
      });
    });
  } catch (error) {
    console.error('Temp directory error:', error);
    throw error;
  }
};

router.post('/analyzefile', (req, res) => {
  upload(req, res, async (err) => {
    let processId;
    const tempDir = path.join(os.tmpdir(), 'codeinsights', `process_${Date.now()}`);

    try {
      await fs.mkdir(tempDir, { recursive: true, mode: 0o755 });

      if (err) throw new Error(err instanceof multer.MulterError ?
        `Upload error: ${err.message}` : 'Server error during file upload');

      if (!req.files?.files?.length) {
        throw new Error('No files were uploaded');
      }

      const { provider, modelType, selectedOptions } = req.body;
      if (!provider || !modelType || !selectedOptions) {
        throw new Error('Missing required fields');
      }

      processId = `reviews/${Date.now()}`;

      const uploadPromises = req.files.files.map(file => 
        fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, `${processId}/files`)
      );

      const complianceUpload = req.files.compliance 
        ? fileManager.saveTextContentToS3AndDB(
            req.files.compliance[0].buffer, 
            req.files.compliance[0].originalname, 
            `${processId}/compliance`
          )
        : null;

      const additionalFilesUploads = req.files.additionalFiles 
        ? req.files.additionalFiles.map(file => 
            fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, `${processId}/additional`)
          )
        : [];

      const uploadedFiles = await Promise.all([
        ...uploadPromises,
        ...(complianceUpload ? [complianceUpload] : []),
        ...(additionalFilesUploads || [])
      ]);

      const inputData = {
        files_data: uploadedFiles.filter(f => f.s3_key.includes('/files')),
        compliance_file: uploadedFiles.find(f => f.s3_key.includes('/compliance')),
        additional_files: uploadedFiles.filter(f => f.s3_key.includes('/additional')),
        output_types: JSON.parse(selectedOptions),
        provider,
        model_name: modelType,
        temp_dir: tempDir
      };

      const result = await executePythonScript(inputData, tempDir);
      
      if (result.status === 'success') {
        const savedResult = await fileManager.saveTextContentToS3AndDB(
          JSON.stringify(result.results), 
          'results.json', 
          processId
        );
        console.log('Saved with ID:', savedResult.id);

        
        const resultUrl = await fileManager.getDownloadUrl(savedResult.id);
        
        res.json({
          success: true,
          message: 'Analysis completed',
          processId: processId,
          filesProcessed: req.files.files.length,
          results: result.results,
          resultUrl: resultUrl
        });
      } else {
        throw new Error(result.message || 'Unknown processing error');
      }
      console.log(res.json)

    } catch (error) {
      console.error('API Error:', error);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      if (processId) {
        await fileManager.saveTextContentToS3AndDB(
          JSON.stringify({ error: error.message }), 
          'error.json', 
          processId
        ).catch(console.error);
      }
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to clean up temp directory:', err);
      }
    }
  });
});


router.get('/generated_analyzed_files_docs/reviews/:processId', async (req, res) => {
  try {
    const { processId } = req.params;
    const files = await fileManager.listFilesInFolder(`reviews/${processId}`);
    
    if (!files || files.length === 0) {
      return res.json({ status: 'processing', processId });
    }

    const resultsKey = files.find(file => file.Key.endsWith('results.json'));
    const errorKey = files.find(file => file.Key.endsWith('error.json'));

    if (!resultsKey && !errorKey) {
      return res.json({ status: 'processing', processId });
    }

    if (errorKey) {
      const errorObj = await fileManager.s3.getObject({
        Bucket: fileManager.bucket,
        Key: errorKey.Key
      }).promise();
      
      const errorContent = JSON.parse(errorObj.Body.toString());
      return res.status(400).json({
        status: 'failed',
        error: errorContent.error || 'Unknown error occurred',
        processId
      });
    }

    if (resultsKey) {
      const resultObj = await fileManager.s3.getObject({
        Bucket: fileManager.bucket,
        Key: resultsKey.Key
      }).promise();

      const results = JSON.parse(resultObj.Body.toString());
      
      const resultUrl = await fileManager.s3.getSignedUrl('getObject', {
        Bucket: fileManager.bucket,
        Key: resultsKey.Key,
        Expires: 3600,
        ResponseContentType: 'application/json',
        ResponseContentDisposition: `attachment; filename="results-${processId}.json"`
      });

      return res.json({
        status: 'completed',
        results,
        resultUrl,
        processId
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message, processId });
  }
});

module.exports = router;