const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const List = require('../models/List');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { check, validationResult } = require('express-validator');

// Setup multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// @route   GET api/list
// @desc    Get all lists for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const lists = await List.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    // Calculate subscriber count for each list
    const listsWithCounts = lists.map(list => {
      return {
        _id: list._id,
        name: list.name,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        subscriberCount: list.subscribers.length
      };
    });
    
    res.json(listsWithCounts);
  } catch (err) {
    console.error('Get lists error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/list/:id
// @desc    Get a specific list
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    
    // Check if list exists
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    // Check if user owns the list
    if (list.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    res.json(list);
  } catch (err) {
    console.error('Get list error:', err.message);
    
    // Check if the error is due to an invalid ID
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'List not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/list
// @desc    Create a new list
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name } = req.body;
      
      // Check if list with same name already exists for this user
      const existingList = await List.findOne({ 
        user: req.user.id,
        name
      });
      
      if (existingList) {
        return res.status(400).json({ message: 'A list with this name already exists' });
      }
      
      // Create new list
      const newList = new List({
        name,
        user: req.user.id,
        subscribers: []
      });
      
      const list = await newList.save();
      
      res.json(list);
    } catch (err) {
      console.error('Create list error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST api/list/import
// @desc    Import subscribers from CSV
// @access  Private
router.post('/import', [auth, upload.single('file')], async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }
    
    // Check if list ID was provided
    if (!req.body.listId) {
      return res.status(400).json({ message: 'Please specify a list' });
    }
    
    // Check if list exists and user has access
    const list = await List.findById(req.body.listId);
    
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    if (list.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Read and process CSV file
    const results = [];
    const filePath = req.file.path;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Validate if email field exists
        if (data.email) {
          results.push(data);
        }
      })
      .on('end', async () => {
        // Delete the temporary file
        fs.unlinkSync(filePath);
        
        // Check if we have any valid results
        if (results.length === 0) {
          return res.status(400).json({ message: 'No valid email addresses found in the CSV' });
        }
        
        // Apply the 200 email limit
        const limitedResults = results.slice(0, 200);
        
        // Create subscriber objects
        const subscribers = limitedResults.map(data => {
          return {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            metadata: {
              ...data,
              email: undefined,
              firstName: undefined,
              lastName: undefined
            },
            addedAt: new Date()
          };
        });
        
        // Filter out duplicate emails
        const existingEmails = new Set(list.subscribers.map(sub => sub.email));
        const newSubscribers = subscribers.filter(sub => !existingEmails.has(sub.email));
        
        // Add subscribers to the list
        list.subscribers = [...list.subscribers, ...newSubscribers];
        await list.save();
        
        res.json({ 
          success: true, 
          importedCount: newSubscribers.length,
          totalCount: list.subscribers.length
        });
      });
  } catch (err) {
    console.error('Import subscribers error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/list/:id/subscriber
// @desc    Add a subscriber to a list
// @access  Private
router.post(
  '/:id/subscriber',
  [
    auth,
    [
      check('email', 'Please include a valid email').isEmail()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { email, firstName, lastName } = req.body;
      
      // Check if list exists and user has access
      const list = await List.findById(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }
      
      if (list.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      
      // Check if email already exists in the list
      const emailExists = list.subscribers.some(sub => sub.email === email);
      
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists in this list' });
      }
      
      // Add subscriber to the list
      list.subscribers.push({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        addedAt: new Date()
      });
      
      await list.save();
      
      res.json({ success: true, subscriber: { email, firstName, lastName } });
    } catch (err) {
      console.error('Add subscriber error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE api/list/:id/subscriber/:email
// @desc    Remove a subscriber from a list
// @access  Private
router.delete('/:id/subscriber/:email', auth, async (req, res) => {
  try {
    // Check if list exists and user has access
    const list = await List.findById(req.params.id);
    
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    if (list.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Decode email from URL
    const email = decodeURIComponent(req.params.email);
    
    // Remove subscriber from the list
    list.subscribers = list.subscribers.filter(sub => sub.email !== email);
    
    await list.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove subscriber error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/list/:id
// @desc    Delete a list
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if list exists and user has access
    const list = await List.findById(req.params.id);
    
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    if (list.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Delete the list
    await list.remove();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete list error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
