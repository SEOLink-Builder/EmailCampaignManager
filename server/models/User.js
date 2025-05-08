const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free'
  },
  planDetails: {
    emailsPerList: {
      type: Number,
      default: 100 // Free plan default
    },
    emailsPerHour: {
      type: Number,
      default: 200 // Free plan default
    },
    emailsPerDay: {
      type: Number,
      default: 500 // Free plan default
    },
    emailsPerMonth: {
      type: Number,
      default: 5000 // Free plan default
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now
    },
    subscriptionEndDate: {
      type: Date,
      default: null
    }
  },
  settings: {
    senderName: {
      type: String,
      default: ''
    },
    replyToEmail: {
      type: String,
      default: ''
    },
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    openaiApiKey: {
      type: String,
      default: ''
    },
    smtp: {
      host: {
        type: String,
        default: ''
      },
      port: {
        type: Number,
        default: 587
      },
      secure: {
        type: Boolean,
        default: false
      },
      auth: {
        user: {
          type: String,
          default: ''
        },
        pass: {
          type: String,
          default: ''
        }
      },
      enabled: {
        type: Boolean,
        default: false
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash the password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords for login
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('User', UserSchema);
