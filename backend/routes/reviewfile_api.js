const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const { Document, Packer, Paragraph } = require('docx');
const FileReview = require('../models/FileReview');

// Create temporary directory in system temp folder
const createTempDir = async () => {
  const tempBasePath = path.join(os.tmpdir(), 'codeinsights');
  await fs.mkdir(tempBasePath, { recursive: true });
  const tempDir = await fs.mkdtemp(path.join(tempBasePath, 'review-'));
  return tempDir;
};

// Configure multer with error handling
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).fields([
  { name: 'files', maxCount: 50 },
  { name: 'compliance', maxCount: 1 },
  { name: 'additionalFiles', maxCount: 20 }
]);

// Enhanced Python script execution with proper file handling
// Fixed executePythonScript function
async function executePythonScript(inputData, reviewId) {
  const tempDir = await createTempDir();
  
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python script execution timed out after 5 minutes'));
    }, 300000); // 5 minute timeout

    try {
      const scriptPath = path.resolve(__dirname, '../util/analyze_files.py');
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Python script not found at path: ${scriptPath}`);
      }

      // Write input data to a temporary file
      const inputFile = path.join(tempDir, 'input.json');
      const outputFile = path.join(tempDir, 'output.json');
      
      await fs.writeFile(inputFile, JSON.stringify({
        ...inputData,
        review_id: reviewId,
        temp_dir: tempDir
      }));

      const pythonProcess = spawn('python3', [
        scriptPath,
        '--input', inputFile,
        '--output', outputFile
      ]);

      let errorData = '';

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python stderr for review ${reviewId}:`, data.toString());
      });

      pythonProcess.on('close', async (code) => {
        clearTimeout(timeout);
        try {
          if (code !== 0) {
            throw new Error(`Python process exited with code ${code}. Error: ${errorData}`);
          }

          const resultData = await fs.readFile(outputFile, 'utf-8');
          const result = JSON.parse(resultData);

          if (result.status === 'error') {
            throw new Error(result.message);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          // Clean up temporary files
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (cleanupError) {
            console.error('Failed to clean up temp directory:', cleanupError);
          }
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

    } catch (error) {
      clearTimeout(timeout);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to clean up temp directory:', cleanupError);
      }
      reject(error);
    }
  });
}


// Main route handler
router.post('/analyzefile', (req, res) => {
  let review = null;
  let tempDir = null;
  
  upload(req, res, async (err) => {
    try {
      // Handle upload errors
      if (err) {
        const errorMessage = err instanceof multer.MulterError 
          ? `Upload error: ${err.message}`
          : 'Server error during file upload';
        return res.status(400).json({ success: false, error: errorMessage });
      }

      // Create temporary directory for this request
      tempDir = await createTempDir();

      // Validate request
      if (!req.files?.files || req.files.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }

      const { provider, modelType, selectedOptions } = req.body;
      if (!provider || !modelType || !selectedOptions) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: provider, modelType, or selectedOptions'
        });
      }

      // Create review document with proper error handling
      try {
        review = new FileReview({
          modelType,
          provider,
          selectedOptions: JSON.parse(selectedOptions),
          mainFiles: req.files.files.map(file => ({
            filename: file.originalname,
            relativePath: file.originalname,
            content: file.buffer.toString('utf-8')
          })),
          complianceFile: req.files.compliance?.[0] ? {
            filename: req.files.compliance[0].originalname,
            content: req.files.compliance[0].buffer.toString('utf-8')
          } : undefined,
          additionalFiles: req.files.additionalFiles?.map(file => ({
            filename: file.originalname,
            content: file.buffer.toString('utf-8')
          })) || [],
          status: 'pending',
          tempDir: tempDir, // Store temp directory path
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await review.save();
      } catch (error) {
        console.error('Failed to create review document:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create review document'
        });
      }

      // Send initial response
      res.status(202).json({
        success: true,
        message: 'Analysis started',
        reviewId: review._id,
        filesProcessed: req.files.files.length
      });

      // Process the files asynchronously
      try {
        review.status = 'processing';
        await review.save();

        const pythonInputData = {
          files_data: review.mainFiles,
          compliance_file_data: review.complianceFile,
          additional_files: review.additionalFiles,
          output_types: review.selectedOptions,
          provider: review.provider,
          model_name: review.modelType
        };

        const result = await executePythonScript(pythonInputData, review._id);
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(os.tmpdir(), 'codeinsights', 'output');
        await fs.mkdir(outputDir, { recursive: true });
        
        const docPath = path.join(outputDir, `review_${review._id}.docx`);
        
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: "Code Review Report",
                heading: 1
              }),
              ...Object.entries(result.results).map(([type, content]) => [
                new Paragraph({
                  text: type.toUpperCase(),
                  heading: 2
                }),
                new Paragraph({
                  text: content,
                  spacing: { before: 200, after: 200 }
                })
              ]).flat()
            ]
          }]
        });

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(docPath, buffer);

        review.status = 'completed';
        review.results = result.results;
        review.docPath = docPath;
        review.updatedAt = new Date();
        await review.save();

      } catch (error) {
        console.error('Processing error:', error);
        review.status = 'failed';
        review.error = error.message;
        review.updatedAt = new Date();
        await review.save();
      } finally {
        // Clean up temporary directory
        if (tempDir) {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (cleanupError) {
            console.error('Failed to clean up temp directory:', cleanupError);
          }
        }
      }

    } catch (error) {
      console.error('API Error:', error);
      if (!res.headersSent) {
        // In the server-side code, modify the initial response:
res.status(202).json({
  success: true,
  message: 'Analysis started',
  FilesreviewId: review._id.toString(), // Explicitly convert ObjectId to string
  filesProcessed: req.files.files.length
});
      }
      if (review) {
        review.status = 'failed';
        review.error = error.message;
        review.updatedAt = new Date();
        await review.save().catch(err => {
          console.error('Failed to update review status:', err);
        });
      }
      // Clean up temporary directory on error
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error('Failed to clean up temp directory:', cleanupError);
        }
      }
    }
  });
});

module.exports = router;