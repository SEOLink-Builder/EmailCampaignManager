const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// More strict rate limiting for authentication routes to prevent brute force
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login/register requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts, please try again later.'
  }
});

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
app.use('/', express.static(path.join(__dirname, '..'))); // Serve files from the root directory

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth')); // Apply stricter rate limiting to auth routes
app.use('/api/user', require('./routes/user')); // User profile and plan management
app.use('/api/list', require('./routes/list'));
app.use('/api/template', require('./routes/template'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/dashboard', require('./routes/analytics')); // Reuse analytics for dashboard data
app.use('/api/email', require('./routes/email')); // SMTP testing and email utilities
app.use('/api/admin', require('./routes/admin')); // Admin dashboard and user management

// Test route
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../test.html'));
});

// Root route - redirect to client
app.get('/', (req, res) => {
  res.redirect('/client/index.html');
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
