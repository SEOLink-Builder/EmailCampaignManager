const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Load environment variables
require('dotenv').config();

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'email-campaign-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.mongodb.net/email-campaign-tool?retryWrites=true&w=majority',
    collectionName: 'sessions' 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Serve static files from client directory
app.use('/client', express.static(path.join(__dirname, '../client')));
app.use('/data', express.static(path.join(__dirname, '../data')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/list', require('./routes/list'));
app.use('/api/template', require('./routes/template'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/dashboard', require('./routes/analytics')); // Reuse analytics for dashboard data

// Root route - redirect to client
app.get('/', (req, res) => {
  res.redirect('/client');
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
