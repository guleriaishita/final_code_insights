const mongoose = require('mongoose');

const FileReviewSchema = new mongoose.Schema({
    modelType: {
        type: String,
        required: true
      },
      provider: {
        type: String,
        required: true
      },
      selectedOptions: [{
        type: String,
        enum: ['review', 'documentation', 'comments']
      }],
      mainFiles: [{
        filename: String,
        relativePath: String,
        content: String
      }],
      complianceFile: {
        filename: String,
        content: String
      },
      additionalFiles: [{
        filename: String,
        content: String
      }],
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      results: {
        review: String,
        documentation: String,
        comments: String
      },
      docPath: String,
      error: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      tempDir: {
        type: String,
        required: false
      }
    });


const FileReview = mongoose.model('FileReview',FileReviewSchema);

// Check if the model exists before creating it
module.exports = FileReview;