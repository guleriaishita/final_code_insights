const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const AWS = require('aws-sdk');
const axios = require('axios');
const FileManagementHelper = require('../helpers_S3/file_management');
const fileManager = new FileManagementHelper();

// Error logging middleware
const logError = (error, step, details = {}) => {
  console.error({
    timestamp: new Date().toISOString(),
    step,
    error: error.message,
    stack: error.stack,
    ...details
  });
};

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
  const scriptPath = path.resolve(__dirname, '../util/comments.py');
  const inputFile = path.join(tempDir, 'input.json');
  const outputFile = path.join(tempDir, 'output.json');
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputFile, JSON.stringify(inputData), 'utf8');
    console.log(`Created temp directory and input file at: ${tempDir}`);
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, '--input', inputFile, '--output', outputFile]);
      let stdoutData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', data => {
        stdoutData += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', data => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('error', error => {
        logError(error, 'python_spawn_error', { scriptPath });
        reject(error);
      });

      pythonProcess.on('close', async code => {
        console.log(`Python process exited with code ${code}`);
        
        if (code !== 0) {
          const error = new Error(`Python process failed with code ${code}: ${errorData}`);
          logError(error, 'python_execution_error', { stdout: stdoutData });
          reject(error);
          return;
        }

        try {
          await fs.access(outputFile);
          const resultData = await fs.readFile(outputFile, 'utf8');
          resolve(JSON.parse(resultData));
        } catch (error) {
          logError(error, 'output_file_error', { outputFile });
          reject(error);
        }
      });
    });
  } catch (error) {
    logError(error, 'execute_python_script');
    throw error;
  }
};

router.post('/generate_comments', (req, res) => {
  let tempDir;
  let processId;
  
  upload(req, res, async (err) => {
    try {
      if (err) {
        logError(err, 'upload_error');
        throw new Error(err instanceof multer.MulterError ?
          `Upload error: ${err.message}` : 'Server error during file upload');
      }

      console.log('Files received:', req.files);
      
      if (!req.files?.files?.length) {
        throw new Error('No files were uploaded');
      }

      const { provider, modelType } = req.body;
      if (!provider || !modelType) {
        throw new Error('Missing required fields: provider and modelType');
      }

      processId = `comments_${Date.now()}`;
      tempDir = path.join(os.tmpdir(), 'docgen', `process_${Date.now()}`);
      
      console.log('Starting comments generation:', { processId, tempDir });

      await fs.mkdir(tempDir, { recursive: true });

      // Handle main files
      console.log('Processing main files...');
      const mainFiles = await Promise.all(req.files.files.map(async file => {
        try {
          return await fileManager.saveTextContentToS3AndDB(
            file.buffer,
            file.originalname,
            `${processId}/files`
          );
        } catch (error) {
          logError(error, 'main_file_upload', { filename: file.originalname });
          throw error;
        }
      }));

      // Handle compliance file
      let complianceFile = null;
      if (req.files.compliance?.[0]) {
        console.log('Processing compliance file...');
        try {
          complianceFile = await fileManager.saveTextContentToS3AndDB(
            req.files.compliance[0].buffer,
            req.files.compliance[0].originalname,
            `${processId}/compliance`
          );
        } catch (error) {
          logError(error, 'compliance_file_upload', {
            filename: req.files.compliance[0].originalname
          });
          throw error;
        }
      }

      // Handle additional files
      console.log('Processing additional files...');
      const additionalFiles = req.files.additionalFiles 
        ? await Promise.all(req.files.additionalFiles.map(async file => {
            try {
              return await fileManager.saveTextContentToS3AndDB(
                file.buffer,
                file.originalname,
                `${processId}/additional`
              );
            } catch (error) {
              logError(error, 'additional_file_upload', { filename: file.originalname });
              throw error;
            }
          }))
        : [];

      // Download files locally
      console.log('Downloading files to local storage...');
      const downloadedFiles = await Promise.all(mainFiles.filter(f => f).map(async file => {
        try {
          const localPath = path.join(tempDir, path.basename(file.s3_key));
          const response = await fileManager.s3.getObject({
            Bucket: fileManager.bucket,
            Key: file.s3_key
          }).promise();
          await fs.writeFile(localPath, response.Body);
          return { ...file, localPath };
        } catch (error) {
          logError(error, 'file_download', { s3_key: file.s3_key });
          throw error;
        }
      }));

      // Prepare input data
      const inputData = {
        files_data: downloadedFiles.map(f => ({
          path: f.localPath,
          name: path.basename(f.s3_key)
        })),
        provider,
        model_name: modelType,
        output_types: ['comments']
      };

      console.log('Executing Python script...');
      const result = await executePythonScript(inputData, tempDir);
      console.log('Python script execution completed');

      if (result.status === 'success') {
        try {
          const savedResult = await fileManager.saveTextContentToS3AndDB(
            JSON.stringify(result.comments),
            'comments.json',
            processId
          );

          const resultUrl = await fileManager.getDownloadUrl(savedResult.id);
          
          res.json({
            success: true,
            message: 'Comments generated successfully',
            processId,
            filesProcessed: req.files.files.length,
            result: result.comments,
            
            resultUrl
          });
        } catch (error) {
          logError(error, 'save_result');
          throw error;
        }
      } else {
        throw new Error(result.message || 'Unknown processing error');
      }

    } catch (error) {
      logError(error, 'generate_comments');
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message,
          step: error.step || 'unknown'
        });
      }

      if (processId) {
        try {
          await fileManager.saveTextContentToS3AndDB(
            JSON.stringify({ 
              error: error.message,
              stack: error.stack,
              step: error.step
            }),
            'error.json',
            processId
          );
        } catch (saveError) {
          logError(saveError, 'error_save');
        }
      }
    } finally {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
          console.log(`Cleaned up temp directory: ${tempDir}`);
        } catch (error) {
          logError(error, 'cleanup');
        }
      }
    }
  });
});

// Backend route
router.get('/output/generated_comments_docs/:processId', async (req, res) => {
  const processId = req.params.processId;

  try {
    // List files in the folder
    const files = await fileManager.listFilesInFolder(processId);

    if (!files?.length) {
      return res.status(404).json({ 
        status: 'failed', 
        error: 'No files found', 
        processId 
      });
    }

    // Find the documentation file using the processId
    const commentsFile = files.find(file => 
      file.Key.includes(processId) && file.Key.endsWith('comments.json')
    );

    if (!commentsFile) {
      return res.status(404).json({ 
        status: 'failed', 
        error: 'Comments file not found', 
        processId 
      });
    }

    // Get the file content from S3
    const fileContent = await fileManager.s3.getObject({
      Bucket: fileManager.bucket,
      Key: commentsFile.Key
    }).promise();

    // Check if fileContent is defined and not empty
    if (!fileContent || !fileContent.Body) {
      return res.status(404).json({
        status: 'failed',
        error: 'File content is empty or not found',
        processId
      });
    }

    const fileContentString = fileContent.Body.toString();

    // Check if the file content is empty
    if (!fileContentString) {
      return res.status(404).json({
        status: 'failed',
        error: 'Empty file content',
        processId
      });
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(fileContentString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ 
        status: 'failed', 
        error: 'Invalid JSON format in the comments file', 
        processId 
      });
    }

    // Generate download URL for the comments file
    const url = await fileManager.s3.getSignedUrl('getObject', {
      Bucket: fileManager.bucket,
      Key: commentsFile.Key,
      Expires: 3600,
      ResponseContentType: 'text/plain',
      ResponseContentDisposition: 'attachment; filename="comments.json"'
    });
    
    return res.status(200).json({
      status: 'completed',
      results: parsedContent,
      resultUrl: url
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      status: 'failed', 
      error: error.message 
    });
  }
});

module.exports = router;