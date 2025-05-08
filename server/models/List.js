const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  metadata: {
    type: Object,
    default: {}
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced'],
    default: 'active'
  }
});

const SegmentationRuleSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: ['engagement_score', 'open_rate', 'click_rate', 'last_opened', 'subscription_date', 'email_domain', 'custom_field']
  },
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'does_not_contain', 'before', 'after']
  },
  value: {
    type: String,
    required: true
  }
});

const SegmentationSchema = new mongoose.Schema({
  rules: [SegmentationRuleSchema],
  matchAll: {
    type: Boolean,
    default: true
  }
});

const ListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscribers: [SubscriberSchema],
  isSegment: {
    type: Boolean,
    default: false
  },
  sourceListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    default: null
  },
  segmentation: {
    type: SegmentationSchema,
    default: null
  },
  senderInfo: {
    name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    replyTo: {
      type: String,
      default: ''
    }
  },
  companyInfo: {
    name: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add virtual for subscriber count
ListSchema.virtual('subscriberCount').get(function() {
  return this.subscribers ? this.subscribers.length : 0;
});

// Ensure virtual fields are included when converting to JSON
ListSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Keep the _id field but remove __v
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('List', ListSchema);
