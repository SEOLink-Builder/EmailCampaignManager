const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route   POST /api/email/test-smtp
 * @desc    Test SMTP connection with provided credentials
 * @access  Private
 */
router.post('/test-smtp', auth, async (req, res) => {
  try {
    const { smtp } = req.body;
    
    // Basic validation
    if (!smtp || !smtp.host || !smtp.port || !smtp.auth || !smtp.auth.user || !smtp.auth.pass) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required SMTP parameters' 
      });
    }
    
    // Create a test transporter
    const testTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port),
      secure: smtp.secure || false,
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass
      },
      // Important: for testing, we don't want to actually send an email
      // Setting a large timeout to make sure we get a response
      connectionTimeout: 10000,
      // Verify only - don't send actual email in test mode
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates for testing
      }
    });
    
    // Verify the connection
    const verifyResult = await testTransporter.verify();
    
    // If verify worked, connection is good
    res.json({
      success: true,
      message: 'SMTP connection test successful',
      result: verifyResult
    });
    
  } catch (error) {
    console.error('SMTP test error:', error);
    
    // Send a more user-friendly error message back to the client
    let errorMessage = 'SMTP connection test failed';
    
    if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out - check your host and port';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - check your host and port';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed - check your username and password';
    } else if (error.message && error.message.includes('certificate')) {
      errorMessage = 'SSL/TLS certificate error - try disabling secure connection or using a different port';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(400).json({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

module.exports = router;