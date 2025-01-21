const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const CodebaseReview = require('../models/CodebaseReview');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
}).fields([
  { name: 'files', maxCount: 50 },
  { name: 'compliance', maxCount: 1 }
]);

async function executePythonScript(data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../util/analyze_codebase.py');
    const pythonProcess = spawn('python3', [scriptPath]);
    let resultData = '';
    let errorData = '';

    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
      console.log('Python stdout:', data.toString()); // Debug log
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error("Python stderr:", data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process closed with code:', code); // Debug log
      console.log('Full result data:', resultData); // Debug log
      
      try {
        // Try to parse the entire output as JSON first
        const result = JSON.parse(resultData);
        if (result.success === false) {
          reject(new Error(result.error || 'Unknown error in Python script'));
        } else {
          resolve(result);
        }
      } catch (e) {
        // If that fails, try to find a JSON object in the output
        try {
          const jsonMatch = resultData.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
          if (jsonMatch) {
            const lastJson = jsonMatch[jsonMatch.length - 1];
            const result = JSON.parse(lastJson);
            resolve(result);
          } else {
            reject(new Error(`No valid JSON found in Python output: ${resultData}`));
          }
        } catch (e2) {
          reject(new Error(`Failed to parse Python response: ${resultData}\nErrors: ${errorData}`));
        }
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      reject(error);
    });
  });
}

async function processCodebaseFiles(files, complianceFile, codebaseReviewId, provider, modelType) {
  try {
    const review = await CodebaseReview.findById(codebaseReviewId);
    if (!review) {
      throw new Error(`Review with ID ${codebaseReviewId} not found`);
    }

    review.status = 'processing';
    await review.save();

    // Create temporary directory for processing
    const tempDir = path.join(__dirname, '../temp', codebaseReviewId.toString());
    fs.mkdirSync(tempDir, { recursive: true });

    // Prepare data for Python script
    const pythonData = {
      files: files.map(file => ({
        filename: file.originalname,
        content: file.buffer.toString('utf-8')
      })),
      compliance: complianceFile ? {
        filename: complianceFile.originalname,
        content: complianceFile.buffer.toString('utf-8')
      } : null,
      provider,
      modelType,
      temp_dir: tempDir
    };

    console.log('Sending data to Python script...');
    const analysisResult = await executePythonScript(pythonData);
    console.log('Received result from Python script:', analysisResult);

    if (!analysisResult || (!analysisResult.content && !analysisResult.analysis)) {
      throw new Error('Invalid or empty result from analysis');
    }

    // Generate doc file with analysis results
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Codebase Review Report",
            heading: 1
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated on: " + new Date().toISOString(),
                italic: true
              })
            ]
          }),
          new Paragraph({
            text: "Analysis Results",
            heading: 2
          }),
          new Paragraph({
            text: analysisResult.content || analysisResult.analysis || "No content available",
            spacing: {
              before: 200,
              after: 200
            }
          })
        ]
      }]
    });

    const docPath = path.join(__dirname, `../output/review_${codebaseReviewId}.docx`);
    const outputDir = path.dirname(docPath);
    fs.mkdirSync(outputDir, { recursive: true });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docPath, buffer);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Update review document
    review.status = 'completed';
    review.result = {
        analysisDate: new Date(),
        content: {
            codebaseStructure: analysisResult.content.codebaseStructure,
            knowledgeGraph: analysisResult.content.knowledgeGraph
        },
        docPath: docPath,
        metadata: {
            ...analysisResult.metadata,  // Include all Python metadata
            filesAnalyzed: files.length,
            completionTime: new Date()
        },
        files: {
            ...analysisResult.files,     // Include all file references
            reportDoc: docPath           // Add the generated doc file
        }
    };
    await review.save();

    return {
      success: true,
      filePath: docPath,
      result: review.result
    };
  } catch (error) {
    console.error('Error processing files:', error);
    const review = await CodebaseReview.findById(codebaseReviewId);
    if (review) {
      review.status = 'failed';
      review.result = {
        error: error.message,
        failureDate: new Date()
      };
      await review.save();
    }
    throw error;
  }
}

router.post('/analyzecodebase', (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: 'Server error during file upload' });
      }

      if (!req.files?.files || req.files.files.length === 0) {
        return res.status(400).json({ error: 'No files were uploaded' });
      }

      const { provider, modelType } = req.body;
      if (!provider || !modelType) {
        return res.status(400).json({ error: 'Provider and model type are required' });
      }

      const review = new CodebaseReview({
        modelType,
        provider,
        folderPath: req.files.files.map(file => ({
          filename: file.originalname,
          relativePath: file.originalname,
        })),
        complianceFile: req.files.compliance?.[0]
          ? { filename: req.files.compliance[0].originalname }
          : undefined,
        status: 'pending',
        result: null
      });

      await review.save();

      // Process files in the background
      processCodebaseFiles(
        req.files.files,
        req.files.compliance?.[0],
        review._id,
        provider,
        modelType
      ).catch(async (error) => {
        console.error('Error in file processing:', error.message);
        review.status = 'failed';
        review.result = {
          error: error.message,
          failureDate: new Date()
        };
        await review.save();
      });

      res.status(201).json({
        message: 'Codebase analysis started',
        reviewId: review._id,
        filesProcessed: req.files.files.length,
        success: true,
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'Failed to analyze codebase',
        details: error.message,
        success: false,
      });
    }
  });
});

module.exports = router;