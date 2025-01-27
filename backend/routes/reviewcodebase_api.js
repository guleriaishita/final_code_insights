const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const router = express.Router();
const FileManagementHelper = require('../helpers_S3/file_management');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

const fileManager = new FileManagementHelper();

async function executePythonScript(files, tempDir) {
  const scriptPath = path.resolve(__dirname, '../util/analyze_codebase.py');
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath]);
    let stdout = '', stderr = '';

    pythonProcess.stdin.write(JSON.stringify({
      files: files.map(file => ({
        filename: file.originalname,
        content: file.buffer.toString('utf-8')
      })),
      temp_dir: tempDir
    }) + '\n');
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', data => {
      console.log('[Python stdout]:', data.toString());
      stdout += data;
    });

    pythonProcess.stderr.on('data', data => stderr += data);

    pythonProcess.on('close', code => {
      if (code !== 0 || stderr.includes('Error:')) {
        reject(new Error(stderr || 'Python script failed'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error(`Failed to parse output: ${stdout}`));
      }
    });
  });
}
router.post('/analyzecodebase', upload.array('files', 50), async (req, res) => {
  const processId = Date.now().toString();
  const tempDir = path.join(os.tmpdir(), 'codebase', processId);
  
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    await fs.mkdir(tempDir, { recursive: true });
    const result = await executePythonScript(req.files, tempDir);

    let analysisContent;
    // If the Python script returns a file path, fetch and read the output
    if (result.output_file) {
      const outputPath = result.output_file;
      const outputContent = await fs.readFile(outputPath, 'utf-8');
      analysisContent = JSON.parse(outputContent);
    } else {
      analysisContent = result.content;
    }

    // Save to S3 and DynamoDB using FileManagementHelper
    const filename = `analysis_${processId}.json`;
    const savedItem = await fileManager.saveTextContentToS3AndDB(
      JSON.stringify({
        content: analysisContent,
        knowledgeGraph: analysisContent.knowledgeGraph || null
      }),
      filename,
      'analyses'  // optional S3 subfolder
    );

    if (!savedItem) {
      throw new Error('Failed to save analysis results');
    }

    res.json({
      success: true,
      content: analysisContent,
      processId: savedItem.id // Use the ID from the saved item
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
});

// Route to fetch analyzed codebase documents
router.get('/output/generated_analyzed_codebase_docs/:processId', async (req, res) => {
  try {
    const fileId = req.params.processId;
    if (!fileId) {
      return res.status(400).json({ error: 'Process ID required' });
    }

    // Fetch file data from DynamoDB using the FileManagementHelper
    const fileDetails = await fileManager.dynamoDB.get({
      TableName: fileManager.tableName,
      Key: { id: fileId }
    }).promise();

    if (!fileDetails.Item) {
      return res.status(404).json({ error: 'Analysis results not found' });
    }

    // Get the file content from S3 
    const s3Response = await fileManager.s3.getObject({
      Bucket: fileManager.bucket,
      Key: fileDetails.Item.s3_key
    }).promise();

    // Convert Buffer to string and parse JSON
    const analysisResult = JSON.parse(s3Response.Body.toString('utf-8'));

    // Get download URL for the file
    const downloadUrl = await fileManager.getDownloadUrl(fileId);

    // Prepare response
    res.json({
      success: true,
      result: {
        content: {
          ...analysisResult.content || analysisResult,
          knowledgeGraph: analysisResult.content?.knowledgeGraph || analysisResult.knowledgeGraph,
          timestamp: fileDetails.Item.timestamp,
          filename: fileDetails.Item.filename
        }
      },
      resultUrl: downloadUrl
    });

  } catch (error) {
    console.error('Failed to fetch results:', error);
    res.status(500).json({
      error: 'Failed to fetch results',
      details: error.message
    });
  }
});

module.exports = router;