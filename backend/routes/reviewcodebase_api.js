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
const upload = multer({ storage: storage }).fields([
  { name: 'files', maxCount: 50 },
  { name: 'compliance_file', maxCount: 1 }
]);

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

async function processCodebaseFiles(files, complianceFile, provider, modelType) {
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
      compliance_file: complianceFile ? {
        filename: complianceFile.originalname,
        content: complianceFile.buffer.toString('utf-8')
      } : null,
      provider,
      modelType,
      temp_dir: tempDir
    };

    const analysisResult = await executePythonScript(inputData, tempDir);

    const result = await fileManager.saveTextContentToS3AndDB(
      JSON.stringify(analysisResult),
      'result.json',
      `reviews/${processId}`
    );

    return {
      success: true,
      processId,
      fileId: result.id,
      fileUrl: await fileManager.getDownloadUrl(result.id),
      content: analysisResult
    };

  } catch (error) {
    throw {
      success: false,
      processId,
      error: error.message
    };
  }
}

router.post('/analyzecodebase', (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) throw new Error(err.message);
      if (!req.files?.files || req.files.files.length === 0) {
        throw new Error('No files uploaded');
      }

      const provider = req.body.provider;
      const modelType = req.body.modelType;
      
      if (!provider || !modelType) {
        throw new Error('Provider and model type are required');
      }

      const result = await processCodebaseFiles(
        req.files.files,
        req.files?.compliance_file?.[0],
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
      res.status(400).json({
        success: false,
        error: error.message
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