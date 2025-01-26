const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const FileManagementHelper = require('../helpers_S3/file_management');
const axios = require('axios');

const fileManager = new FileManagementHelper();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields([
  { name: 'files', maxCount: 50 },
  { name: 'compliance', maxCount: 1 }
]);

async function executePythonScript(inputData) {
  const scriptPath = path.resolve(__dirname, '../util/analyze_codebase.py');
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath]);
    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdin.write(JSON.stringify(inputData) + '\n');
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error('[Python stderr]:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderrData);
        reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
        return;
      }

      try {
        const jsonStr = stdoutData.trim();
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python output:', stdoutData);
        reject(new Error(`Failed to parse Python output: ${e.message}`));
      }
    });
  });
}

async function processCodebaseFiles(files, complianceFile) {
  const processId = Date.now().toString();
  const tempDir = path.join(os.tmpdir(), 'codebase', processId);
  
  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Prepare files data
    const fileContents = await Promise.all(files.map(async (file) => ({
      filename: file.originalname,
      content: file.buffer.toString('utf-8')
    })));

    const inputData = {
      files: fileContents,
      compliance: complianceFile ? {
        filename: complianceFile.originalname,
        content: complianceFile.buffer.toString('utf-8')
      } : null,
      temp_dir: tempDir
    };

    console.log('Executing Python script with input:', JSON.stringify(inputData));
    const analysisResult = await executePythonScript(inputData);
    
    if (!analysisResult || !analysisResult.success) {
      throw new Error(analysisResult?.error || 'Analysis failed');
    }

    return {
      success: true,
      processId,
      content: analysisResult.content
    };

  } catch (error) {
    console.error('[Process Files] Error:', error);
    throw error;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[Cleanup] Error:', error);
    }
  }
}

router.post('/analyzecodebase', (req, res) => {
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: 50
    }
  }).fields([
    { name: 'files', maxCount: 50 },
    { name: 'compliance', maxCount: 1 }
  ])(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }

      if (err) {
        return res.status(500).json({
          success: false,
          error: `Server error during upload: ${err.message}`,
          code: 'SERVER_ERROR'
        });
      }

      if (!req.files?.files || req.files.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
      }

      const result = await processCodebaseFiles(
        req.files.files,
        req.files?.compliance?.[0]
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      res.status(201).json(result);

    } catch (error) {
      console.error('[API Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        code: 'PROCESSING_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
});
router.get('/generated_analyzed_codebase_docs/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    if (!reviewId) {
      return res.status(400).json({
        error: 'Review ID is required',
        code: 'MISSING_ID'
      });
    }

    const url = await fileManager.getDownloadUrl(reviewId);
    
    if (!url) {
      return res.status(404).json({
        error: 'Review not found',
        code: 'NOT_FOUND'
      });
    }

    const response = await axios.get(url, { timeout: 5000 });
    
    if (!response.data) {
      throw new Error('No data received from storage');
    }

    res.json({
      success: true,
      result: response.data,
      resultUrl: url
    });

  } catch (error) {
    console.error('[Get Results] Error:', error);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message || 'Failed to retrieve results',
      code: error.response?.status ? 'EXTERNAL_ERROR' : 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});
module.exports = router;