const mongoose = require('mongoose');

const PlanRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentPlan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    required: true
  },
  requestedPlan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  adminMessage: {
    type: String,
    default: ''
  },
  adminResponse: {
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlanRequest', PlanRequestSchema);