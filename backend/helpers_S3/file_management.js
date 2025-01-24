const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const axios = require('axios')
const mammoth = require('mammoth')
class FileManagementHelper {
    constructor(tableName = 'testgen-test', region = 'ap-south-1') {
        AWS.config.update({ region: region });
        this.dynamoDB = new AWS.DynamoDB.DocumentClient();
        this.s3 = new AWS.S3();
        this.tableName = tableName;
        this.bucket = 'testgen-bucket';
    }

    async readDocxContent(fileId) {
        try {
            const fileUrl = await this.getDownloadUrl(fileId);
            if (!fileUrl) {
                throw new Error('Could not generate download URL');
            }

            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const result = await mammoth.extractRawText({
                buffer: Buffer.from(response.data)
            });

            return result.value || 'No content found';

        } catch (error) {
            console.error('Error reading DOCX content:', error);
            throw new Error('Failed to extract document content');
        }
    }

    async saveFileToS3AndDB(localFilePath, s3Subfolder = '', extraArgs = {}) {
        try {
            const fileId = uuidv4();
            const timestamp = new Date().toISOString();
            const fileName = path.basename(localFilePath);

            // Construct S3 key
            let s3Key = s3Subfolder ? `${s3Subfolder}/${fileName}` : fileName;
            s3Key = s3Key.replace(/^\//, '');  // Remove leading slash

            // Upload to S3
            const uploadParams = {
                Bucket: this.bucket,
                Key: s3Key,
                Body: fs.createReadStream(localFilePath),
                ...extraArgs
            };
            await this.s3.upload(uploadParams).promise();

            // Prepare DynamoDB item
            const item = {
                id: fileId,
                local_filepath: localFilePath,
                s3_key: s3Key,
                filename: fileName,
                timestamp: timestamp,
                bucket: this.bucket,
                type: 'file'
            };

            // Save to DynamoDB
            await this.dynamoDB.put({
                TableName: this.tableName,
                Item: item
            }).promise();

            console.log(`Successfully saved file ${fileName} to S3 and DynamoDB`);
            return item;
        } catch (error) {
            console.error('Error saving file:', error);
            return null;
        }
    }

    async saveTextContentToS3AndDB(content, filename, s3Subfolder = '') {
        try {
            const fileId = uuidv4();
            const timestamp = new Date().toISOString();

            // Construct S3 key
            let s3Key = s3Subfolder ? `${s3Subfolder}/${filename}` : filename;
            s3Key = s3Key.replace(/^\//, '');  // Remove leading slash

            // Upload content to S3
            await this.s3.putObject({
                Bucket: this.bucket,
                Key: s3Key,
                Body: content,
                ContentType: 'text/plain'
            }).promise();

            // Prepare DynamoDB item
            const item = {
                id: fileId,
                local_filepath: 'generated_content',
                s3_key: s3Key,
                filename: filename,
                timestamp: timestamp,
                bucket: this.bucket,
                type: 'file'
            };

            // Save to DynamoDB
            await this.dynamoDB.put({
                TableName: this.tableName,
                Item: item
            }).promise();

            console.log(`Successfully saved content as ${filename}`);
            return item;
        } catch (error) {
            console.error('Error saving content:', error);
            return null;
        }
    }

    async getDownloadUrl(fileId, expiration = 3600) {
        try {
            // Get file metadata from DynamoDB
            const response = await this.dynamoDB.get({
                TableName: this.tableName,
                Key: { id: fileId }
            }).promise();

            const item = response.Item;
            if (!item) {
                console.error(`No file found with ID: ${fileId}`);
                return null;
            }

            // Generate presigned URL
            const url = await this.s3.getSignedUrl('getObject', {
                Bucket: this.bucket,
                Key: item.s3_key,
                Expires: expiration
            });

            console.log(`Generated URL for file ${item.filename}`);
            return url;
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }
    async listFilesInFolder(prefix) {
        try {
          const params = {
            Bucket: this.bucket,
            Prefix: prefix
          };
      
          const response = await this.s3.listObjectsV2(params).promise();
          return response.Contents;
        } catch (error) {
          console.error('Error listing files:', error);
          return [];
        }
      }
}

module.exports = FileManagementHelper;