const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get current user data
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user plan
router.post('/plan', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }
    
    // Get plan limits based on the selected plan
    const planLimits = {
      free: {
        emailsPerList: 100,
        emailsPerHour: 200,
        emailsPerDay: 500,
        emailsPerMonth: 5000
      },
      starter: {
        emailsPerList: 200,
        emailsPerHour: 300,
        emailsPerDay: 800,
        emailsPerMonth: 10000
      },
      pro: {
        emailsPerList: 300,
        emailsPerHour: 500,
        emailsPerDay: 1200,
        emailsPerMonth: 25000
      },
      enterprise: {
        emailsPerList: 500,
        emailsPerHour: 800,
        emailsPerDay: 2000,
        emailsPerMonth: 50000
      }
    };
    
    // Calculate subscription end date (30 days from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
    
    // Update user plan
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        plan,
        planDetails: {
          ...planLimits[plan],
          subscriptionStartDate: new Date(),
          subscriptionEndDate: plan === 'free' ? null : subscriptionEndDate
        }
      },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: `Successfully updated to ${plan} plan`,
      user
    });
  } catch (error) {
    console.error('Error updating user plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current plan details
router.get('/plan', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('plan planDetails');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const planNames = {
      free: 'Free Plan',
      starter: 'Starter Plan',
      pro: 'Pro Plan',
      enterprise: 'Enterprise Plan'
    };
    
    const planFeatures = {
      free: {
        companyEmailSending: false,
        aiTesting: false,
        analyticsLevel: 'basic',
        support: 'community',
        customBranding: false,
        watermark: true
      },
      starter: {
        companyEmailSending: true,
        aiTesting: 'limited',
        analyticsLevel: 'low',
        support: 'email',
        customBranding: true,
        watermark: false
      },
      pro: {
        companyEmailSending: true,
        aiTesting: 'full',
        analyticsLevel: 'medium',
        support: 'priority',
        customBranding: true,
        watermark: false
      },
      enterprise: {
        companyEmailSending: true,
        aiTesting: 'advanced',
        analyticsLevel: 'high',
        support: '24/7',
        customBranding: true,
        watermark: false
      }
    };
    
    // Calculate days remaining in subscription
    let daysRemaining = null;
    if (user.planDetails.subscriptionEndDate) {
      const currentDate = new Date();
      const endDate = new Date(user.planDetails.subscriptionEndDate);
      daysRemaining = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      plan: user.plan,
      planName: planNames[user.plan],
      planDetails: user.planDetails,
      features: planFeatures[user.plan],
      daysRemaining
    });
  } catch (error) {
    console.error('Error fetching plan details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;