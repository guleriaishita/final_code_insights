const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const FileManagementHelper = require('../helpers_S3/file_management');
const { v4: uuidv4 } = require('uuid');

const fileManager = new FileManagementHelper();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
  .fields([
    { name: 'files', maxCount: 50 },
    { name: 'compliance', maxCount: 1 },
    { name: 'additionalFiles', maxCount: 20 }
  ]);

async function executePythonScript(inputData) {
  try {
    const scriptPath = path.resolve(__dirname, '../util/analyze_files.py');
    const inputFile = path.join(__dirname, `input-${Date.now()}.json`);
    const outputFile = path.join(__dirname, `output-${Date.now()}.json`);

    await fs.writeFile(inputFile, JSON.stringify(inputData));

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, '--input', inputFile, '--output', outputFile]);
      let errorData = '';

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python Error: ${data}`);
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(error);
      });

      pythonProcess.on('close', async (code) => {
        try {
          const resultData = await fs.readFile(outputFile, 'utf8');
          await Promise.all([
            fs.unlink(inputFile).catch(console.error),
            fs.unlink(outputFile).catch(console.error)
          ]);
          
          if (code !== 0) {
            reject(new Error(`Python process failed: ${errorData}`));
            return;
          }
          
          resolve(JSON.parse(resultData));
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Execute Python Script Error:', error);
    throw error;
  }
}

async function processFiles(files, complianceFile, additionalFiles, reviewId, provider, modelType, selectedOptions) {
  try {
    const s3Prefix = `reviews/${reviewId}`;

    // Save files to S3 first
    const savedFiles = await Promise.all(files.map(file => 
      fileManager.saveTextContentToS3AndDB(
        file.buffer, 
        file.originalname, 
        `${s3Prefix}/files/${file.originalname}`
      )
    ));

    // Process files for analysis
    const filesData = files.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('utf-8')
    }));

    // Run analysis
    const result = await executePythonScript({
      files_data: filesData,
      output_types: selectedOptions,
      provider,
      model_name: modelType
    });

    // Save results
    const resultFile = await fileManager.saveTextContentToS3AndDB(
      JSON.stringify(result),
      'analysis_results.json',
      `${s3Prefix}/results/analysis_results.json`
    );

    const fileUrl = await fileManager.getDownloadUrl(resultFile.id);

    return {
      fileUrl,
      content: result,
      fileId: resultFile.id,
      savedFiles: savedFiles.map(f => f.id)
    };
  } catch (error) {
    console.error('Process Files Error:', error);
    throw error;
  }
}

router.post('/analyzefile', (req, res) => {
  upload(req, res, async (err) => {
    try {
      

      if (!req.files?.files?.length) {
        throw new Error('No files uploaded');
      }

      const { provider, modelType, selectedOptions } = req.body;
      if (!provider || !modelType || !selectedOptions) {
        throw new Error('Missing required fields');
      }

      const reviewId = uuidv4();
      console.log('Processing review:', reviewId);

      const result = await processFiles(
        req.files.files,
        req.files.compliance?.[0],
        req.files.additionalFiles,
        reviewId,
        provider,
        modelType,
        JSON.parse(selectedOptions)
      );

      res.status(200).json({
        success: true,
        reviewId,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        content: result.content
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});


router.get('/generated_analyzed_files/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const resultData = await fileManager.readTextContent({
      id: reviewId,
      s3_key: `reviews/${reviewId}/results/analysis_results.json`
    });

    if (!resultData) return res.status(404).json({ error: 'Review not found' });
    res.json(JSON.parse(resultData));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;