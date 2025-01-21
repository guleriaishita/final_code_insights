const mongoose = require('mongoose');
const CodebaseReviewSchema = new mongoose.Schema({

  modelType: String,
  provider: String,
  folderPath: [{
    filename: String,
    relativePath: String
  }],
  complianceFile: {
    filename: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  result: {
    content: {
      codebaseStructure: String,
      knowledgeGraph: String
    },
    docPath: String,
    metadata: {
      provider: String,
      model_type: String,
      analysis_timestamp: String,
      temp_dir: String,
      files_processed: Number,
      has_compliance_file: Boolean,
      filesAnalyzed: Number,
      completionTime: Date
    },
    files: {
      created: [String],
      compliance: String,
      codebaseStructure: String,
      knowledgeGraph: String,
      reportDoc: String
    },
    error: String,
    failureDate: Date
  }
}, {
  timestamps: true
}
);
const CodebaseReview = mongoose.model('CodebaseReview', CodebaseReviewSchema);

module.exports = CodebaseReview;