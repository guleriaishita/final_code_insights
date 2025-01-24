const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const FileReview = require('../models/FileReview');
const FileManagementHelper = require("../helpers_S3/file_management");

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
    const inputFile = path.join(tempDir, 'input.json');
    const outputFile = path.join(tempDir, 'output.json');
    
    // Transform file data to match Python script expectations
    const transformedData = {
      ...inputData,
      files_data: inputData.files_data.map(file => ({
        filename: file.s3_key.split('/').pop(),
        // Convert buffer to string content
        content: file.buffer ? file.buffer.toString('utf8') : ''
      })),
      compliance_file_data: inputData.compliance_file ? {
        filename: inputData.compliance_file.s3_key.split('/').pop(),
        content: inputData.compliance_file.buffer.toString('utf8')
      } : null,
      additional_files: (inputData.additional_files || []).map(file => ({
        filename: file.s3_key.split('/').pop(),
        content: file.buffer ? file.buffer.toString('utf8') : ''
      }))
    };

    await fs.writeFile(inputFile, JSON.stringify(transformedData));
    
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
    throw new Error(`Script execution failed: ${error.message}`);
  }
};

router.post('/analyzefile', (req, res) => {
  upload(req, res, async (err) => {
    const tempDir = path.join(os.tmpdir(), 'codeinsights', Date.now().toString());
    let review = null;

    try {
      await fs.mkdir(tempDir, { recursive: true });

      if (err) throw new Error(err instanceof multer.MulterError ? 
        `Upload error: ${err.message}` : 'Server error during file upload');

      if (!req.files?.files?.length) {
        throw new Error('No files were uploaded');
      }

      const { provider, modelType, selectedOptions } = req.body;
      if (!provider || !modelType || !selectedOptions) {
        throw new Error('Missing required fields');
      }

      const s3Subfolder = `reviews/${Date.now()}`;
      const uploadPromises = req.files.files.map(file => 
        fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, s3Subfolder)
      );

      if (req.files.compliance) {
        uploadPromises.push(fileManager.saveTextContentToS3AndDB(
          req.files.compliance[0].buffer,
          req.files.compliance[0].originalname,
          `${s3Subfolder}/compliance`
        ));
      }

      if (req.files.additionalFiles) {
        uploadPromises.push(...req.files.additionalFiles.map(file =>
          fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, `${s3Subfolder}/additional`)
        ));
      }

      const uploadedFiles = await Promise.all(uploadPromises);

      review = new FileReview({
        modelType,
        provider,
        selectedOptions: JSON.parse(selectedOptions),
        s3Folder: s3Subfolder,
        status: 'pending'
      });
      await review.save();

      // Send initial response
      res.status(202).json({
        success: true,
        message: 'Analysis started',
        FilesreviewId: review._id.toString(),
        filesProcessed: req.files.files.length
      });

      // Process files asynchronously
      try {
        review.status = 'processing';
        await review.save();

        const inputData = {
          files_data: uploadedFiles.filter(f => !f.s3_key.includes('/compliance') && !f.s3_key.includes('/additional')),
          compliance_file: uploadedFiles.find(f => f.s3_key.includes('/compliance')),
          additional_files: uploadedFiles.filter(f => f.s3_key.includes('/additional')),
          output_types: JSON.parse(selectedOptions),
          provider,
          model_name: modelType,
          temp_dir: tempDir
        };

        const result = await executePythonScript(inputData, tempDir);
        
        if (result.status === 'success') {
          review.status = 'completed';
          review.results = result.results;
          await review.save();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Processing error:', error);
        review.status = 'failed';
        review.error = error.message;
        await review.save();
      }
    } catch (error) {
      console.error('API Error:', error);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (review) {
        review.status = 'failed';
        review.error = error.message;
        await review.save();
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

router.get('/reviews/:id', async (req, res) => {
  try {
    const review = await FileReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      status: review.status,
      results: review.results,
      provider: review.provider,
      modelType: review.modelType,
      createdAt: review.createdAt,
      error: review.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;