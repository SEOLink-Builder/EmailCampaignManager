const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('name', 'Name is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      user = new User({
        email,
        password,
        name
      });

      await user.save();

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'jwt-secret-token',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ 
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              createdAt: user.createdAt,
              token
            }
          });
        }
      );
    } catch (err) {
      console.error('Registration error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if password matches
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Update last login time
      user.lastLogin = Date.now();
      await user.save();

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'jwt-secret-token',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ 
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              createdAt: user.createdAt,
              lastLogin: user.lastLogin,
              token
            }
          });
        }
      );
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST api/auth/logout
// @desc    Logout user / Clear session
// @access  Private
router.post('/logout', auth, (req, res) => {
  try {
    // In a real app with actual sessions, we would destroy the session
    // Since we're using JWT for now, we'll just return a success message
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/auth/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update settings
    if (settings) {
      user.settings = {
        ...user.settings,
        ...settings
      };
    }
    
    // Check if OpenAI API key was updated
    if (settings && settings.openaiApiKey) {
      // If key is provided, update environment variable
      // Note: This only updates it for the current session
      process.env.OPENAI_API_KEY = settings.openaiApiKey;
      console.log('OpenAI API key updated');
      
      // Re-initialize the OpenAI client in aiService
      try {
        const aiService = require('../services/aiService');
        aiService.initializeOpenAI(settings.openaiApiKey);
      } catch (error) {
        console.error('Error re-initializing OpenAI client:', error.message);
      }
    }
    
    await user.save();
    
    // Return the updated user (without password)
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/auth/delete-account
// @desc    Delete user account and all associated data
// @access  Private
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify password if provided
    if (password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Get models
    const Campaign = require('../models/Campaign');
    const List = require('../models/List');
    const Template = require('../models/Template');
    
    // Delete all user data
    await Campaign.deleteMany({ user: req.user.id });
    await List.deleteMany({ user: req.user.id });
    await Template.deleteMany({ user: req.user.id });
    
    // Delete the user
    await User.findByIdAndDelete(req.user.id);
    
    res.json({ message: 'User account and all data deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
