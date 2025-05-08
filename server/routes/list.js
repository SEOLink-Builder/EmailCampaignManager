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

// @route   POST api/list/import-manual
// @desc    Import subscribers from manually entered emails
// @access  Private
router.post('/import-manual', [
  auth,
  [
    check('listId', 'List ID is required').not().isEmpty(),
    check('emails', 'Emails array is required').isArray(),
    check('emails.*', 'Invalid email').isEmail()
  ]
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { listId, emails } = req.body;

    // Find the list
    const list = await List.findById(listId);
    
    // Check if list exists
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    // Check if list belongs to user
    if (list.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to access this list' });
    }
    
    // Check email count limit (200 per list)
    if (list.subscribers.length + emails.length > 200) {
      return res.status(400).json({ 
        message: `Cannot import ${emails.length} emails. Maximum 200 subscribers per list. Currently ${list.subscribers.length} subscribers.`
      });
    }
    
    // Process and validate emails
    const newSubscribers = [];
    
    // Add each email to the list if it doesn't already exist
    for (const email of emails) {
      // Check if email already exists in the list
      const emailExists = list.subscribers.some(sub => sub.email.toLowerCase() === email.toLowerCase());
      
      if (!emailExists) {
        // Add new subscriber
        newSubscribers.push({
          email: email.toLowerCase(),
          status: 'active',
          addedAt: Date.now()
        });
      }
    }
    
    // Add new subscribers to the list
    list.subscribers = [...list.subscribers, ...newSubscribers];
    list.updatedAt = Date.now();
    
    await list.save();
    
    // Return success response
    res.json({ 
      success: true,
      importedCount: newSubscribers.length,
      totalSubscribers: list.subscribers.length
    });
    
  } catch (err) {
    console.error('Manual email import error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/list/segment
// @desc    Create a new segment from an existing list
// @access  Private
router.post('/segment', [
  auth,
  [
    check('name', 'Segment name is required').not().isEmpty(),
    check('sourceListId', 'Source list ID is required').not().isEmpty(),
    check('segmentation', 'Segmentation criteria is required').exists(),
    check('segmentation.rules', 'At least one segmentation rule is required').isArray({ min: 1 })
  ]
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, subtitle, description, sourceListId, segmentation } = req.body;

    // Find the source list
    const sourceList = await List.findById(sourceListId);
    
    // Check if source list exists
    if (!sourceList) {
      return res.status(404).json({ message: 'Source list not found' });
    }
    
    // Check if source list belongs to user
    if (sourceList.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to access this list' });
    }
    
    // Apply segmentation rules to filter the subscribers
    const segmentedSubscribers = filterSubscribersBySegmentationRules(
      sourceList.subscribers, 
      segmentation.rules, 
      segmentation.matchAll || true
    );
    
    // Create the new segment
    const newSegment = new List({
      name,
      subtitle: subtitle || 'Segment',
      description: description || `Segment created from ${sourceList.name}`,
      user: req.user.id,
      subscribers: segmentedSubscribers,
      isSegment: true,
      sourceListId: sourceList._id,
      segmentation: {
        rules: segmentation.rules,
        matchAll: segmentation.matchAll || true
      },
      // Copy sender and company info from the source list
      senderInfo: sourceList.senderInfo || {},
      companyInfo: sourceList.companyInfo || {}
    });
    
    await newSegment.save();
    
    // Return the new segment with subscriber count
    const result = {
      _id: newSegment._id,
      name: newSegment.name,
      subscriberCount: segmentedSubscribers.length,
      isSegment: true,
      sourceListName: sourceList.name
    };
    
    res.json(result);
    
  } catch (err) {
    console.error('Create segment error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Filter subscribers based on segmentation rules
 * @param {Array} subscribers - List of subscribers to filter
 * @param {Array} rules - Segmentation rules
 * @param {Boolean} matchAll - Whether all rules must match (AND) or any rule can match (OR)
 * @returns {Array} - Filtered subscribers
 */
function filterSubscribersBySegmentationRules(subscribers, rules, matchAll = true) {
  return subscribers.filter(subscriber => {
    // For each subscriber, check if they match the rules
    const ruleResults = rules.map(rule => {
      const { field, operator, value } = rule;
      
      // Handle different field types
      switch (field) {
        case 'engagement_score':
          // Simulate an engagement score for demo purposes
          // In a real application, this would come from subscriber data
          const engagementScore = subscriber.metadata?.engagement_score || 
            Math.floor(Math.random() * 10); // Random score for demonstration
          return compareValues(engagementScore, operator, parseFloat(value));
          
        case 'open_rate':
          // Simulate open rate
          const openRate = subscriber.metadata?.open_rate || 
            Math.random(); // Random rate for demonstration
          return compareValues(openRate, operator, parseFloat(value) / 100); // Convert percentage to decimal
          
        case 'click_rate':
          // Simulate click rate
          const clickRate = subscriber.metadata?.click_rate || 
            Math.random() * 0.5; // Random rate for demonstration (lower than open rate)
          return compareValues(clickRate, operator, parseFloat(value) / 100); // Convert percentage to decimal
          
        case 'last_opened':
          // Simulate last opened date
          const lastOpened = subscriber.metadata?.last_opened ? 
            new Date(subscriber.metadata.last_opened) : 
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
          return compareDates(lastOpened, operator, new Date(value));
          
        case 'subscription_date':
          // Use the actual subscription date
          return compareDates(new Date(subscriber.addedAt), operator, new Date(value));
          
        case 'email_domain':
          // Extract domain from email
          const domain = subscriber.email.split('@')[1];
          return compareStrings(domain, operator, value);
          
        case 'custom_field':
          // Check if there's a custom field with this value
          // This is simplified for demonstration
          const hasCustomField = Object.values(subscriber.metadata || {})
            .some(fieldValue => compareStrings(String(fieldValue), 'contains', value));
          return hasCustomField;
          
        default:
          return false;
      }
    });
    
    // Determine if subscriber matches based on matchAll parameter
    if (matchAll) {
      return ruleResults.every(result => result); // All rules must match (AND)
    } else {
      return ruleResults.some(result => result); // Any rule can match (OR)
    }
  });
}

/**
 * Compare numerical values
 * @param {number} actual - Actual value
 * @param {string} operator - Comparison operator
 * @param {number} expected - Expected value
 * @returns {boolean} - Whether the comparison is true
 */
function compareValues(actual, operator, expected) {
  switch (operator) {
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    case 'greater_than': return actual > expected;
    case 'less_than': return actual < expected;
    default: return false;
  }
}

/**
 * Compare dates
 * @param {Date} actual - Actual date
 * @param {string} operator - Comparison operator
 * @param {Date} expected - Expected date
 * @returns {boolean} - Whether the comparison is true
 */
function compareDates(actual, operator, expected) {
  switch (operator) {
    case 'equals': return actual.getTime() === expected.getTime();
    case 'not_equals': return actual.getTime() !== expected.getTime();
    case 'before': return actual < expected;
    case 'after': return actual > expected;
    default: return false;
  }
}

/**
 * Compare strings
 * @param {string} actual - Actual string
 * @param {string} operator - Comparison operator
 * @param {string} expected - Expected string
 * @returns {boolean} - Whether the comparison is true
 */
function compareStrings(actual, operator, expected) {
  switch (operator) {
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    case 'contains': return actual.includes(expected);
    case 'does_not_contain': return !actual.includes(expected);
    default: return false;
  }
}

module.exports = router;
