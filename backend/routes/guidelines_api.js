const express = require("express");
const router = express.Router();
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const { Document, Packer, Paragraph } = require("docx");
const FileManagementHelper = require("../helpers_S3/file_management");

const fileManager = new FileManagementHelper();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function executePythonScript(data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../util/generate_guidelines.py");
    const pythonProcess = spawn("python3", [scriptPath]);
    let resultData = "", errorData = "";

    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on("data", (data) => resultData += data.toString());
    pythonProcess.stderr.on("data", (data) => errorData += data.toString());

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process failed with code ${code}: ${errorData}`));
      } else {
        try {
          const result = JSON.parse(resultData);
          resolve(result.status === "error" ? Promise.reject(new Error(result.message)) : result);
        } catch (e) {
          reject(new Error(`Failed to parse Python response: ${resultData}`));
        }
      }
    });
  });
}

async function processFiles(files, guidelineId, provider, modelType) {
  try {
    const fileContents = files.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString("utf-8"),
    }));

    const result = await executePythonScript({
      selectedOption: "files",
      files: fileContents,
      provider,
      modelType,
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Code Guidelines Document",
            heading: 1,
          }),
          ...result.content.split("\n").map(line => 
            new Paragraph({
              text: line.trim(),
              spacing: { before: 200, after: 200 }
            })
          )
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const docFilename = `guideline_${guidelineId}.docx`;
    const s3Subfolder = `guidelines/${guidelineId}`;
    
    const savedFile = await fileManager.saveTextContentToS3AndDB(
      buffer, 
      docFilename,
      s3Subfolder
    );

    if (!savedFile) {
      throw new Error("Failed to save document to S3");
    }

    const downloadUrl = await fileManager.getDownloadUrl(savedFile.id);
    return { fileUrl: downloadUrl, result };

  } catch (error) {
    console.error("Error processing files:", error);
    throw error;
  }
}

router.post("/generate_guidelines", upload.array("files"), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    const { selectedOption, provider, modelType } = req.body;
    if (!provider || !modelType) {
      return res.status(400).json({ error: "Provider and model type are required" });
    }

    const guidelineId = Date.now().toString(); // Simple unique ID generation
    const s3Subfolder = `guidelines/${guidelineId}/inputs`;
    
    const uploadPromises = req.files.map(file => 
      fileManager.saveTextContentToS3AndDB(file.buffer, file.originalname, s3Subfolder)
    );
    await Promise.all(uploadPromises);

    const result = await processFiles(req.files, guidelineId, provider, modelType);

    res.status(201).json({
      message: "Guidelines generated successfully",
      guidelineId,
      filesProcessed: req.files.length,
      ...result
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to generate guidelines",
      details: error.message,
    });
  }
});

router.get('/generated_guidelines_docs/:id', async (req, res) => {
  try {
    const guidelineId = req.params.id;
    const docFilename = `guideline_${guidelineId}.docx`;
    const s3Subfolder = `guidelines/${guidelineId}`;
    
    const fileUrl = await fileManager.getDownloadUrl(`${s3Subfolder}/${docFilename}`);
    
    if (!fileUrl) {
      return res.status(404).json({ error: 'Guideline not found' });
    }

    return res.json({
      status: 'completed',
      fileUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;