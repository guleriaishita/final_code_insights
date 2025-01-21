const mongoose = require('mongoose');

const GuidelineSchema = new mongoose.Schema({
 type: String,
 provider: String,
 modelType: String,
 status: {
   type: String,
   enum: ['pending', 'processing', 'completed', 'failed'],
   default: 'pending'
 },
 result: String,
 docPath: String,
 createdAt: {
   type: Date,
   default: Date.now
 }
});




const Guideline = mongoose.model('Guideline', GuidelineSchema);


module.exports = Guideline;