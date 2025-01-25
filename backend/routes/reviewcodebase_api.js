const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const FileManagementHelper = require('../helpers_S3/file_management');
const axios = require('axios')

const fileManager = new FileManagementHelper();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array('files', 50);
async function executePythonScript(inputData, tempDir) {
  try {
    const scriptPath = path.resolve(__dirname, '../util/analyze_codebase.py');
    const pythonProcess = spawn('python3', [scriptPath]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    return new Promise((resolve, reject) => {
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error('[Python stderr]:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        try {
          // Clean the output and find JSON
          const lines = stdoutData.split('\n');
          const jsonLine = lines.find(line => {
            try {
              line = line.trim();
              return line.startsWith('{') && line.endsWith('}') && JSON.parse(line);
            } catch {
              return false;
            }
          });

          if (jsonLine) {
            resolve(JSON.parse(jsonLine));
          } else {
            console.error('Python output:', stdoutData);
            console.error('Python errors:', stderrData);
            reject(new Error(stderrData || 'No valid JSON output found'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${e.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[Python Execution] Error:', error);
    throw error;
  }
}
// Update the processCodebaseFiles function
async function processCodebaseFiles(files, provider, modelType) {
  const processId = Date.now().toString();
  const tempDir = path.join(os.tmpdir(), 'codebase', processId);
  
  try {
    await fs.mkdir(tempDir, { recursive: true });

    const fileContents = files.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('utf-8')
    }));

    const inputData = {
      files: fileContents,
      provider,
      modelType,
      temp_dir: tempDir
    };

    const analysisResult = await executePythonScript(inputData, tempDir);

    if (!analysisResult) {
      throw new Error('Invalid or empty result from analysis');
    }

    // Save results to S3 and handle potential null result
    const resultItem = await fileManager.saveTextContentToS3AndDB(
      JSON.stringify(analysisResult),
      'result.json',
      `reviews/${processId}`
    );

    if (!resultItem) {
      throw new Error('Failed to save analysis results to S3');
    }

    const fileUrl = await fileManager.getDownloadUrl(resultItem.id);

    if (!fileUrl) {
      throw new Error('Failed to generate download URL');
    }

    return {
      success: true,
      processId,
      fileUrl,
      content: analysisResult,
      fileId: resultItem.id
    };

  } catch (error) {
    console.error('[Process] Error:', error);
    
    // Save error to S3 and handle potential null result
    const errorItem = await fileManager.saveTextContentToS3AndDB(
      JSON.stringify({
        status: 'failed',
        error: error.message,
        failureDate: new Date().toISOString()
      }),
      'error.json',
      `reviews/${processId}`
    );

    const errorResult = {
      success: false,
      processId,
      error: error.message
    };

    if (errorItem) {
      errorResult.fileId = errorItem.id;
      errorResult.fileUrl = await fileManager.getDownloadUrl(errorItem.id);
    }

    throw errorResult;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('[Cleanup] Error:', err);
    }
  }
}

// Update the route handler
router.post('/analyzecodebase', (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        throw new Error(err.message);
      }

      if (!req.files || req.files.length === 0) {
        throw new Error('No files uploaded');
      }

      const provider = req.body.provider;
      const modelType = req.body.modelType; // Changed from model_name to modelType
      
      if (!provider || !modelType) {
        throw new Error('Provider and model type are required');
      }

      const result = await processCodebaseFiles(
        req.files,
        provider,
        modelType
      );

      res.status(201).json({
        message: 'Codebase analysis started',
        processId: result.processId,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        content: result.content,
        success: true
      });

    } catch (error) {
      console.error('[API] Error:', error);
      let errorMessage = error.message;
      if (error.message.includes('Python process failed')) {
        errorMessage = 'Analysis failed: ' + (error.message.split('Python process failed:')[1] || 'Unknown error');
      }
      res.status(400).json({
        success: false,
        error: errorMessage,
        details: error.message
      });
    }
  });
});


router.get('/generated_analyzed_codebase_docs/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const url = await fileManager.getDownloadUrl(reviewId);
    
    if (!url) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Fetch content from S3 using the signed URL
    const response = await axios.get(url);
    const result = response.data;

    return res.json({
      result,
      resultUrl: url
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;