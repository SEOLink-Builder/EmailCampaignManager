const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Template = require('../models/Template');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const aiService = require('../services/aiService');

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

// @route   POST api/template/:id/optimize-subject
// @desc    Generate AI-optimized subject lines for a template
// @access  Private
router.post('/:id/optimize-subject', auth, async (req, res) => {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ 
        message: 'OpenAI API key is not configured',
        needsApiKey: true
      });
    }
    
    // Get the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Get the template category and any audience info from request
    const { category, audience } = req.body;
    
    // Generate optimized subject lines using OpenAI
    const optimizedSubjects = await aiService.generateOptimizedSubjects(
      template.subject,
      template.content,
      category || template.category,
      audience || ''
    );
    
    // Update the template with the AI-generated subject lines
    template.aiOptimizedSubjects = optimizedSubjects;
    template.updatedAt = Date.now();
    
    await template.save();
    
    // Return the optimized subject lines
    res.json({
      originalSubject: template.subject,
      optimizedSubjects: template.aiOptimizedSubjects
    });
    
  } catch (err) {
    console.error('Optimize subject error:', err.message);
    // Check for our custom error code for missing API key
    if (err.code === 'OPENAI_API_KEY_MISSING') {
      return res.status(400).json({ 
        message: err.message,
        needsApiKey: true,
        code: 'OPENAI_API_KEY_MISSING'
      });
    }
    // Check for quota exceeded errors
    else if (err.code === 'OPENAI_QUOTA_EXCEEDED' || err.code === 'insufficient_quota') {
      return res.status(429).json({ 
        message: 'OpenAI API quota exceeded. Please check your billing details or try again later.',
        code: 'OPENAI_QUOTA_EXCEEDED'
      });
    }
    // Check for other OpenAI errors that might indicate auth issues
    else if (err.message.includes('API key') || err.message.includes('OpenAI API')) {
      return res.status(400).json({ 
        message: 'OpenAI API key error: ' + err.message,
        needsApiKey: true
      });
    }
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST api/template/:id/select-subject
// @desc    Select an AI-optimized subject line for the template
// @access  Private
router.post('/:id/select-subject', auth, async (req, res) => {
  try {
    // Get the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const { selectedSubject } = req.body;
    
    if (!selectedSubject) {
      return res.status(400).json({ message: 'Selected subject is required' });
    }
    
    // Check if the selected subject is in the list of optimized subjects
    if (!template.aiOptimizedSubjects.includes(selectedSubject) && selectedSubject !== template.subject) {
      return res.status(400).json({ message: 'Invalid subject selection' });
    }
    
    // Update the template with the selected subject
    template.selectedAiSubject = selectedSubject;
    template.subject = selectedSubject; // Also update the main subject
    template.updatedAt = Date.now();
    
    await template.save();
    
    res.json({
      success: true,
      subject: template.subject
    });
    
  } catch (err) {
    console.error('Select subject error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/template/:id/analyze-content
// @desc    Analyze email content and provide improvement suggestions
// @access  Private
router.post('/:id/analyze-content', auth, async (req, res) => {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ 
        message: 'OpenAI API key is not configured',
        needsApiKey: true,
        score: 0,
        suggestions: ['Set up your OpenAI API key to enable AI-powered content analysis'],
        strengths: []
      });
    }
    
    // Get the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Analyze the email content
    const analysis = await aiService.analyzeEmailContent(template.content);
    
    // Return the analysis
    res.json(analysis);
    
  } catch (err) {
    console.error('Analyze content error:', err.message);
    // Check for our custom error code for missing API key
    if (err.code === 'OPENAI_API_KEY_MISSING') {
      return res.status(400).json({ 
        message: err.message,
        needsApiKey: true,
        code: 'OPENAI_API_KEY_MISSING',
        score: 0,
        suggestions: ['Set up your OpenAI API key to enable AI-powered content analysis'],
        strengths: []
      });
    }
    // Check for quota exceeded errors
    else if (err.code === 'OPENAI_QUOTA_EXCEEDED' || err.code === 'insufficient_quota') {
      return res.status(429).json({ 
        message: 'OpenAI API quota exceeded. Please check your billing details or try again later.',
        code: 'OPENAI_QUOTA_EXCEEDED',
        score: 0,
        suggestions: ['Your OpenAI API quota has been exceeded. This is common with free tier accounts.', 
                     'Consider upgrading your OpenAI plan or waiting until your quota refreshes.'],
        strengths: []
      });
    }
    // Check for other OpenAI errors that might indicate auth issues
    else if (err.message.includes('API key') || err.message.includes('OpenAI API')) {
      return res.status(400).json({ 
        message: 'OpenAI API key error: ' + err.message,
        needsApiKey: true,
        score: 0,
        suggestions: [],
        strengths: []
      });
    }
    res.status(500).json({ 
      message: 'Server error: ' + err.message,
      score: 0,
      suggestions: ['An error occurred while analyzing the content'],
      strengths: []
    });
  }
});

// @route   POST api/template/:id/preview
// @desc    Generate a preview of the template with sample data
// @access  Private
router.post('/:id/preview', auth, async (req, res) => {
  try {
    // Get the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Get user information
    const user = await User.findById(req.user.id);
    
    // Make sure req.body is an object even if it's null
    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    
    // Use sample data or personalized data if provided
    const sampleData = {
      firstName: requestBody.firstName || 'John',
      lastName: requestBody.lastName || 'Doe',
      email: requestBody.email || 'subscriber@example.com'
    };
    
    // Replace template placeholders with sample data
    let emailContent = template.content;
    let emailSubject = template.subject;
    
    // Replace basic placeholders
    emailContent = emailContent
      .replace(/{{firstName}}/g, sampleData.firstName || '')
      .replace(/{{lastName}}/g, sampleData.lastName || '')
      .replace(/{{email}}/g, sampleData.email || 'subscriber@example.com')
      .replace(/{{unsubscribe}}/g, 'https://example.com/unsubscribe?email=' + encodeURIComponent(sampleData.email || 'subscriber@example.com'));
    
    emailSubject = emailSubject
      .replace(/{{firstName}}/g, sampleData.firstName || '')
      .replace(/{{lastName}}/g, sampleData.lastName || '')
      .replace(/{{email}}/g, sampleData.email || 'subscriber@example.com');
    
    // Get sender name and reply-to from user settings or use defaults
    const senderName = user.settings?.senderName || 'Email Campaign Tool';
    const replyToEmail = user.settings?.replyToEmail || user.email;
    
    // Create a complete email preview with headers
    const previewHtml = `
      <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">
        <div><strong>From:</strong> ${senderName} &lt;sender@emailcampaigntool.com&gt;</div>
        <div><strong>To:</strong> ${sampleData.firstName || 'John'} ${sampleData.lastName || 'Doe'} &lt;${sampleData.email || 'subscriber@example.com'}&gt;</div>
        <div><strong>Subject:</strong> ${emailSubject}</div>
        <div><strong>Reply-To:</strong> ${replyToEmail}</div>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        ${emailContent}
      </div>
    `;
    
    // Return the preview HTML
    res.json({
      preview: previewHtml,
      subject: emailSubject,
      content: emailContent
    });
    
  } catch (err) {
    console.error('Preview template error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
