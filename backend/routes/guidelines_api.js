const express = require("express");
const router = express.Router();
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { Document, Packer, Paragraph } = require("docx");
const Guideline = require("../models/Guideline"); // Adjust the path as needed

// Set up multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});

async function executePythonScript(data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(
      __dirname,
      "../util/generate_guidelines.py"
    );
    const pythonProcess = spawn("python3", [scriptPath]);
    let resultData = "";
    let errorData = "";

    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
      console.error("Python stderr:", data.toString());
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Python process failed with code ${code}: ${errorData}`)
        );
      } else {
        try {
          const result = JSON.parse(resultData);
          if (result.status === "error") {
            reject(new Error(result.message));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python response: ${resultData}`));
        }
      }
    });
  });
}

async function processFiles(files, guidelineId, provider, modelType) {
  try {
    const guideline = await Guideline.findById(guidelineId);
    guideline.status = "processing";
    await guideline.save();

    const fileContents = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer.toString("utf-8"),
    }));

    const pythonData = {
      selectedOption: "files",
      files: fileContents,
      provider: provider,
      modelType: modelType,
    };

    const result = await executePythonScript(pythonData);

    // Generate .doc file
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Code Guidelines Document",
              heading: 1,
            }),
            ...result.content.split("\n").map(
              (line) =>
                new Paragraph({
                  text: line.trim(),
                  spacing: {
                    before: 200,
                    after: 200,
                  },
                })
            ),
          ],
        },
      ],
    });

    const docPath = path.join(
      __dirname,
      `../output/guideline_${guidelineId}.docx`
    );

    // Ensure output directory exists
    const outputDir = path.dirname(docPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docPath, buffer);

    guideline.status = "completed";
    guideline.result = result.content;
    guideline.docPath = docPath;
    await guideline.save();

    return { filePath: docPath, result };
  } catch (error) {
    console.error("Error processing files:", error);
    const guideline = await Guideline.findById(guidelineId);
    guideline.status = "failed";
    guideline.result = error.message;
    await guideline.save();
    throw error;
  }
}

// Route handler for guidelines generation
router.post("/generate_guidelines", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    const { selectedOption, provider, modelType } = req.body;

    if (!provider || !modelType) {
      return res
        .status(400)
        .json({ error: "Provider and model type are required" });
    }

    const guideline = new Guideline({
      type: selectedOption || "files",
      provider,
      modelType,
      status: "pending",
    });

    await guideline.save();

    // Start processing files asynchronously
    processFiles(req.files, guideline._id, provider, modelType).catch((error) =>
      console.error("Error in file processing:", error)
    );

    res.status(201).json({
      message: "Guidelines generation started",
      guidelineId: guideline._id,
      filesProcessed: req.files.length,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to generate guidelines",
      details: error.message,
    });
  }
});

// Add this route to your existing router file

module.exports = router;
