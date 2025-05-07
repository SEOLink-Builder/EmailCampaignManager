const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Template = require('../models/Template');
const { check, validationResult } = require('express-validator');

// @route   GET api/template
// @desc    Get all templates for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const templates = await Template.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error('Get templates error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/template/:id
// @desc    Get a specific template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    // Check if template exists
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Check if user owns the template
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    res.json(template);
  } catch (err) {
    console.error('Get template error:', err.message);
    
    // Check if the error is due to an invalid ID
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/template
// @desc    Create a new template
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('subject', 'Subject is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name, subject, content } = req.body;
      
      // Create new template
      const newTemplate = new Template({
        name,
        subject,
        content,
        user: req.user.id
      });
      
      const template = await newTemplate.save();
      
      res.json(template);
    } catch (err) {
      console.error('Create template error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/template/:id
// @desc    Update a template
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('subject', 'Subject is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name, subject, content } = req.body;
      
      // Check if template exists and user has access
      const template = await Template.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      if (template.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      
      // Update template
      template.name = name;
      template.subject = subject;
      template.content = content;
      template.updatedAt = Date.now();
      
      const updatedTemplate = await template.save();
      
      res.json(updatedTemplate);
    } catch (err) {
      console.error('Update template error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE api/template/:id
// @desc    Delete a template
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if template exists and user has access
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Delete the template
    await template.remove();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
