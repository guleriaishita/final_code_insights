const express = require('express');
const router = express.Router();
const Guideline = require('../models/Guideline');
const CodebaseReview = require('../models/CodebaseReview');
const FileReview = require('../models/FileReview');
const neo4j = require('neo4j-driver');
const fs = require('fs').promises
const { ObjectId } = require('mongoose').Types
require('dotenv').config();
const mongoose = require('mongoose');

const username = process.env.NEO4J_USER;
// const username = os.getenv('NEO4J_USER')
// const uri = os.getenv('NEO4J_URI')
const uri = process.env.NEO4J_URI;
const password = process.env.NEO4J_PASSWORD;
// const password = os.getenv('NEO4J_PASSWORD')

const driver = neo4j.driver('neo4j://20.193.154.253:7687', neo4j.auth.basic(username, password));
const session = driver.session();

router.get('/generated_guidelines_docs', async (req, res) => {
  try {
    const { guidelineId } = req.query;  // Get guidelineId from query parameters

    if (!guidelineId) {
      return res.status(400).json({ message: 'guidelineId is required' });
    }

    // Fetch the guideline by its ID from the database
    const guideline = await Guideline.findById(guidelineId)
      .select('result status createdAt provider modelType'); // Select specific fields

    if (!guideline) {
      return res.status(404).json({ message: 'Guideline not found' });
    }

    res.json(guideline);  // Send the specific guideline as JSON
  } catch (error) {
    console.error('Error fetching guideline:', error);
    res.status(500).json({ message: 'Failed to fetch guideline', error: error.message });
  }
});
router.get('/guideline', async (req, res) => {
  try {
    // Find the most recent guideline by sorting in descending order of creation date
    const latestGuideline = await Guideline.findOne()
      .sort({ createdAt: -1 })  // Sort by creation date in descending order
      .select('_id result status provider modelType createdAt');  // Select the fields we want

    if (!latestGuideline) {
      return res.status(404).json({ 
        success: false,
        message: 'No guidelines found' 
      });
    }

    res.status(200).json({
      success: true,
      guidelineId: latestGuideline._id,
      data: latestGuideline
    });

  } catch (error) {
    console.error('Error fetching latest guideline:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching latest guideline',
      error: error.message 
    });
  }
});


router.get('/generated_analyzed_codebase_docs', async (req, res) => {
  try {
    const reviewId = req.query.CodeBasereviewId;

    if (!reviewId) {
      return res.status(400).json({ message: 'reviewId is required' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID format' });
    }

    // Fetch the complete document from MongoDB including all content
    const codebaseReview = await CodebaseReview.findById(reviewId);

    if (!codebaseReview) {
      return res.status(404).json({ message: 'Codebase review not found' });
    }

    // Convert to plain object
    const reviewObject = codebaseReview.toObject();

    // Log the content for debugging
    console.log('MongoDB Content:', {
      hasResult: !!reviewObject.result,
      hasContent: !!reviewObject.result?.content,
      contentStructure: reviewObject.result?.content || {}
    });

    // Prepare the response
    const response = {
      ...reviewObject,
      result: {
        ...reviewObject.result,
        content: reviewObject.result?.content || {
          codebaseStructure: '',
          knowledgeGraph: ''
        }
      },
      metadata: {
        hasResult: !!reviewObject.result,
        hasContent: !!reviewObject.result?.content,
        contentTypes: {
          codebaseStructure: typeof reviewObject.result?.content?.codebaseStructure,
          knowledgeGraph: typeof reviewObject.result?.content?.knowledgeGraph
        },
        contentLengths: {
          codebaseStructure: reviewObject.result?.content?.codebaseStructure?.length || 0,
          knowledgeGraph: reviewObject.result?.content?.knowledgeGraph?.length || 0
        }
      }
    };

    // Log the final response for debugging
    console.log('Sending response:', JSON.stringify(response, null, 2));

    return res.json(response);

  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      type: error.name
    });

    return res.status(500).json({
      message: 'Failed to fetch codebase review',
      error: error.message,
      errorType: error.name
    });
  }
});
 router.get('/reviewcodebase', async (req, res) => {
  try {
    const latestCodebase = await CodebaseReview.findOne()
      .sort({ createdAt: -1 })
      .limit(1);

    if (latestCodebase) {
      res.json({
        success: true,
       codebaseId: latestCodebase._id
      });
    } else {
     res.json({
        success: false,
       message: 'No codebase found'
      });
    }
  } catch (error) {
    console.error('Error fetching codebase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch codebase'
    });
   }
});





router.get('/generated_analyzed_files_docs', async (req, res) => {
  try {
    const filesReviewId = req.query.FilesreviewId;
    console.log('Received request for ID:', filesReviewId);

    if (!filesReviewId) {
      return res.status(400).json({ message: 'FilesreviewId is required' });
    }

    // Update the select to include the results field
    const filesReview = await FileReview.findById(filesReviewId)
      .select('results status createdAt provider modelType docPath')
      .lean();

    console.log('Database query result:', filesReview);

    if (!filesReview) {
      return res.status(404).json({ message: 'Files review not found' });
    }

    // Restructure the response to include the results
    const response = {
      ...filesReview,
      result: filesReview.results, // Add the results object directly
      _debug: {
        hasResult: Boolean(filesReview.results),
        resultType: typeof filesReview.results,
        fields: Object.keys(filesReview)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching files review:', error);
    res.status(500).json({ 
      message: 'Failed to fetch files review', 
      error: error.message
    });
  }
});

router.get('/reviewfiles', async (req, res) => {
  try {
    const latestFiles = await FileReview.findOne()
      .sort({ createdAt: -1 })
      .limit(1);

    if (latestFiles) {
      res.json({
        success: true,
        fileId: latestFiles._id
      });
    } else {
      res.json({
        success: false,
        message: 'No files review found'
      });
    }
  } catch (error) {
    console.error('Error fetching files review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch files review'
    });
  }
});


router.get('/generated_knowledge_graph', async(req, res) => {
  try {
    const graphData = await session.run('MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100');
    
    // Transform Neo4j data into a format suitable for visualization
    const graph = graphData.records.map(record => ({
      node1: {
        id: record.get('n').identity.toString(),
        ...record.get('n').properties
      },
      relationship: record.get('r').type,
      node2: {
        id: record.get('m').identity.toString(),
        ...record.get('m').properties
      }
    }));

    res.json({
      success: true,
      graphData: graph
    });
  } catch (err) {
    console.error('Error fetching graph data:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching data from Neo4j'
    });
  }
});

module.exports = router; // Ensure you export the router

