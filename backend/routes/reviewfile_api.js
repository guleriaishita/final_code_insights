const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const axios = require('axios');
const FileManagementHelper = require('../helpers_S3/file_management');
const fileManager = new FileManagementHelper();

// Configure multer
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
  const scriptPath = path.resolve(__dirname, '../util/review.py');
  const inputFile = path.join(tempDir, 'input.json');
  const outputFile = path.join(tempDir, 'output.json');
  
  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    await fs.writeFile(inputFile, JSON.stringify(inputData), 'utf8');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, '--input', inputFile, '--output', outputFile]);

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
          await fs.access(outputFile);
          const resultData = await fs.readFile(outputFile, 'utf8');
          resolve(JSON.parse(resultData));
        } catch (error) {
          reject(new Error(`Failed to read output file: ${error.message}`));
        }
      });
    });
  } catch (error) {
    console.error('Error in executePythonScript:', error);
    throw error;
  }
};

router.post('/analyzefile', (req, res) => {
  upload(req, res, async (err) => {
    let tempDir;
    let processId;

    try {
      if (err) {
        console.error('Upload error:', err);
        throw new Error(err instanceof multer.MulterError ?
          `Upload error: ${err.message}` : 'Server error during file upload');
      }

      if (!req.files?.files?.length) {
        throw new Error('No files were uploaded');
      }

      const { provider, modelType } = req.body;
      if (!provider || !modelType) {
        throw new Error('Missing required fields: provider and modelType');
      }

      processId = `reviews/${Date.now()}`;
      tempDir = path.join(os.tmpdir(), 'codeinsights', `process_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Save main files
      const mainFilesPromises = req.files.files.map(file => 
        fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, `${processId}/files`)
      );

      // Save compliance file if present
      const compliancePromise = req.files.compliance?.[0] 
        ? fileManager.saveTextContentToS3AndDB(
            req.files.compliance[0].buffer,
            req.files.compliance[0].originalname,
            `${processId}/compliance`
          )
        : Promise.resolve(null);

      // Save additional files if present
      const additionalFilesPromises = req.files.additionalFiles
      ? req.files.additionalFiles.map(file =>
          fileManager.saveTextContentToS3AndDB(
            file.buffer,
            file.originalname,
            `${processId}/additional`
          )
        )
      : [];

      const [mainFiles, complianceFile, ...additionalFiles] = await Promise.all([
        Promise.all(mainFilesPromises),
        compliancePromise,
        ...additionalFilesPromises
      ]);
      
      // Download additional files to local
      const additionalLocalFiles = [];
      for (const file of additionalFiles) {
        const localPath = path.join(tempDir, path.basename(file.s3_key));
        const response = await fileManager.s3.getObject({
          Bucket: fileManager.bucket,
          Key: file.s3_key
        }).promise();
        await fs.writeFile(localPath, response.Body);
        additionalLocalFiles.push({
          path: localPath,
          name: path.basename(file.s3_key)
        });
      }

      // Download files from S3 to temp directory
      for (const file of mainFiles) {
        const localPath = path.join(tempDir, path.basename(file.s3_key));
        const response = await fileManager.s3.getObject({
          Bucket: fileManager.bucket,
          Key: file.s3_key
        }).promise();
        await fs.writeFile(localPath, response.Body);
        file.localPath = localPath;
      }

      // Download compliance file if exists
      let complianceLocalPath;
      if (complianceFile) {
        complianceLocalPath = path.join(tempDir, path.basename(complianceFile.s3_key));
        const response = await fileManager.s3.getObject({
          Bucket: fileManager.bucket,
          Key: complianceFile.s3_key
        }).promise();
        await fs.writeFile(complianceLocalPath, response.Body);
      }

      const inputData = {
        files_data: mainFiles.map(f => ({
          path: f.localPath,
          name: path.basename(f.s3_key)
        })),
        compliance_file: complianceFile ? {
          path: complianceLocalPath,
          name: path.basename(complianceFile.s3_key)
        } : undefined,
        additional_files: additionalLocalFiles,
        provider,
        model_name: modelType,
        output_types: ['review']
      };

      console.log('Input data for Python script:', JSON.stringify(inputData, null, 2));
const result = await executePythonScript(inputData, tempDir);
console.log('Python script result:', JSON.stringify(result, null, 2));
      
      if (result.status === 'success') {
        const savedResult = await fileManager.saveTextContentToS3AndDB(
          JSON.stringify(result.results),
          'results.json',
          processId
        );

        const resultUrl = await fileManager.getDownloadUrl(savedResult.id);
        
        res.json({
          success: true,
          message: 'Analysis completed',
          processId,
          filesProcessed: req.files.files.length,
          results: result.results,
          resultUrl
        });
      } else {
        throw new Error(result.message || 'Unknown processing error');
      }

    } catch (error) {
      console.error('Error in /analyzefile route:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error'
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
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Failed to clean up temp directory:', err);
        }
      }
    }
  });
});

// In your reviewfile_api.js
router.get('/output/generated_analyzed_files_docs/reviews/:processId_review', async (req, res) => {
  try {
    const processId = `reviews/${req.params.processId_review}`;
    const files = await fileManager.listFilesInFolder(processId);
    
    if (!files?.length) {
      return res.status(404).json({ status: 'failed', error: 'No files found', processId });
    }

    const resultsFile = files.find(file => file.Key.endsWith('results.json'));
    if (!resultsFile) {
      return res.status(404).json({ status: 'failed', error: 'Results file not found', processId });
    }

    const fileContent = await fileManager.s3.getObject({
      Bucket: fileManager.bucket,
      Key: resultsFile.Key
    }).promise();

    const url = await fileManager.s3.getSignedUrl('getObject', {
      Bucket: fileManager.bucket,
      Key: resultsFile.Key,
      Expires: 3600,
      ResponseContentType: 'application/json',
      ResponseContentDisposition: 'attachment; filename="code_review_results.json"'
    });
    
    return res.status(200).json({
      status: 'completed',
      results: JSON.parse(fileContent.Body.toString()),
      resultUrl: url
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
});
module.exports = router;