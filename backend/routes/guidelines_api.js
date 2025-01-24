const express = require("express");
const router = express.Router();
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const { Document, Packer, Paragraph } = require("docx");
const FileManagementHelper = require("../helpers_S3/file_management");
const fileManager = new FileManagementHelper();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

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
            children: result.content.split("\n").map(line => 
                new Paragraph({ text: line.trim() })
            )
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const docFilename = `guideline_${guidelineId}.docx`;
    const s3Key = `guidelines/${guidelineId}/${docFilename}`;
    
    // Save the file and return the saved file information
    const savedFile = await fileManager.saveTextContentToS3AndDB(buffer, docFilename, s3Key);
    if (!savedFile) {
        throw new Error('Failed to save file to S3 and DB');
    }

    const fileUrl = await fileManager.getDownloadUrl(savedFile.id);
    const content = await fileManager.readDocxContent(savedFile.id);

    return {
        fileUrl,
        content,
        result,
        fileId: savedFile.id  // Return the file ID
    };
}

router.post("/generate_guidelines", upload.array("files"), async (req, res) => {
    try {
        if (!req.files?.length) {
            throw new Error("No files uploaded");
        }
        if (!req.body.provider || !req.body.modelType) {
            throw new Error("Provider and model type required");
        }

        const guidelineId = Date.now().toString();
        console.log("guideline id in /generate_guidelines", guidelineId);
        
        const result = await processFiles(req.files, guidelineId, req.body.provider, req.body.modelType);
        
        res.status(201).json({
            message: "Guidelines generated successfully",
            guidelineId,
            fileId: result.fileId,  // Include the file ID in the response
            fileUrl: result.fileUrl,
            content: result.content
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/generated_guidelines_docs/:id', async (req, res) => {
    try {
        const fileId = req.params.id;  // Use the file ID directly
        
        // Get the file details from DynamoDB
        const dbItem = await fileManager.dynamoDB.get({
            TableName: fileManager.tableName,
            Key: { id: fileId }
        }).promise();

        if (!dbItem.Item) {
            throw new Error('Guideline not found');
        }

        const fileUrl = await fileManager.getDownloadUrl(fileId);
        const content = await fileManager.readDocxContent(fileId);

        res.json({
            status: 'completed',
            fileUrl,
            content
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;