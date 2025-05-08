/**
 * Authentication middleware
 * Verifies the JWT token from request headers
 * Adds the authenticated user's ID to the request object
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Check for session-based auth first (preferred method)
    if (req.session && req.session.userId) {
      // Get user from session ID
      const user = await User.findById(req.session.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid session, please log in again' });
      }
      
      // Set the user in the request
      req.user = user;
      return next();
    }
    
    // Check for token in headers as fallback (for API clients)
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'email-campaign-token');
    
    // Get user from decoded token
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token, user not found' });
    }
    
    // Set the user in the request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please log in again' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};