const express = require('express');
const cors = require('cors');
const apiGuidelines = require('./routes/guidelines_api');
const apiReviewfile = require('./routes/reviewfile_api');
const apiReviewcodebase = require('./routes/reviewcodebase_api');
const morgan = require("morgan");
const apiKnowledgeGraph = require('./routes/knowledgegraph_api');
const path = require('path');
const session = require('express-session'); // Add this line
require('dotenv').config();

const app = express();



// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Your React app's URL
    credentials: true
}));

app.use(session({
  secret: 'your-secret', // Replace 'your-secret' with a strong secret for production
  resave: false,
  saveUninitialized: true
}));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  next();
});

// In your Express app setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api', apiGuidelines);
app.use('/api', apiReviewfile);
app.use('/api', apiReviewcodebase);

app.use('/api/output',apiKnowledgeGraph);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
