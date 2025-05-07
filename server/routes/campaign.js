const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const Template = require('../models/Template');
const List = require('../models/List');
const { check, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// @route   GET api/campaign
// @desc    Get all campaigns for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('list', 'name')
      .populate('template', 'name');
    
    res.json(campaigns);
  } catch (err) {
    console.error('Get campaigns error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/campaign/:id
// @desc    Get a specific campaign
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('list', 'name subscribers')
      .populate('template', 'name subject content');
    
    // Check if campaign exists
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if user owns the campaign
    if (campaign.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error('Get campaign error:', err.message);
    
    // Check if the error is due to an invalid ID
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/campaign
// @desc    Create a new campaign
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('listId', 'List is required').not().isEmpty(),
      check('templateId', 'Template is required').not().isEmpty(),
      check('scheduleDate', 'Schedule date is required').not().isEmpty(),
      check('sendLimit', 'Send limit is required').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name, listId, templateId, scheduleDate, sendLimit } = req.body;
      
      // Check if list exists and user has access
      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }
      if (list.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to use this list' });
      }
      
      // Check if template exists and user has access
      const template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      if (template.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to use this template' });
      }
      
      // Create new campaign
      const newCampaign = new Campaign({
        name,
        list: listId,
        template: templateId,
        scheduleDate: new Date(scheduleDate),
        sendLimit: parseInt(sendLimit),
        status: 'scheduled',
        user: req.user.id,
        totalRecipients: list.subscribers.length,
      });
      
      const campaign = await newCampaign.save();
      
      // Schedule the campaign (mock implementation for now)
      emailService.scheduleCampaign(campaign);
      
      // Return the campaign with populated fields
      const populatedCampaign = await Campaign.findById(campaign._id)
        .populate('list', 'name')
        .populate('template', 'name');
      
      res.json(populatedCampaign);
    } catch (err) {
      console.error('Create campaign error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/campaign/:id/cancel
// @desc    Cancel a campaign
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    // Check if campaign exists and user has access
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    if (campaign.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Check if campaign can be canceled
    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      return res.status(400).json({ message: 'Campaign cannot be canceled' });
    }
    
    // Update campaign status
    campaign.status = 'canceled';
    campaign.updatedAt = Date.now();
    
    await campaign.save();
    
    // Cancel scheduled emails (mock implementation for now)
    emailService.cancelCampaign(campaign._id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Cancel campaign error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
