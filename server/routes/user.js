const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlanRequest = require('../models/PlanRequest');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

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

// Request plan upgrade
router.post('/request-plan-upgrade', 
  [
    auth,
    check('requestedPlan', 'Requested plan is required').isIn(['starter', 'pro', 'enterprise']),
    check('message', 'Message is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestedPlan, message } = req.body;

    try {
      // Get the current user
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent downgrade requests
      const planHierarchy = {
        'free': 0,
        'starter': 1,
        'pro': 2,
        'enterprise': 3
      };
      
      if (planHierarchy[requestedPlan] <= planHierarchy[user.plan]) {
        return res.status(400).json({ 
          message: 'You can only request an upgrade to a higher plan' 
        });
      }
      
      // Check if user already has a pending request for this plan
      const existingRequest = await PlanRequest.findOne({
        user: req.user.id,
        requestedPlan,
        status: 'pending'
      });
      
      if (existingRequest) {
        return res.status(400).json({ 
          message: 'You already have a pending request for this plan' 
        });
      }
      
      // Create new plan request
      const planRequest = new PlanRequest({
        user: req.user.id,
        currentPlan: user.plan,
        requestedPlan,
        message
      });
      
      await planRequest.save();
      
      // Send notification email to admins
      try {
        // Get list of admin users
        const adminUsers = await User.find({ role: 'admin' }).select('email');
        
        if (adminUsers.length > 0) {
          // Get SMTP settings from user or use defaults
          let smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: 'noreply@example.com',
              pass: 'password'
            }
          };
          
          // Use user's SMTP settings if available
          if (user.settings && user.settings.smtp && user.settings.smtp.enabled) {
            smtpConfig = {
              host: user.settings.smtp.host,
              port: user.settings.smtp.port,
              secure: user.settings.smtp.secure,
              auth: {
                user: user.settings.smtp.auth.user,
                pass: user.settings.smtp.auth.pass
              }
            };
          }
          
          const transporter = nodemailer.createTransport(smtpConfig);
          
          const planNames = {
            free: 'Free Plan',
            starter: 'Starter Plan',
            pro: 'Pro Plan',
            enterprise: 'Enterprise Plan'
          };
          
          // Send notification to each admin
          for (const admin of adminUsers) {
            await transporter.sendMail({
              from: `"Email Campaign Tool" <${smtpConfig.auth.user}>`,
              to: admin.email,
              subject: `New Plan Upgrade Request: ${user.name || user.email} to ${planNames[requestedPlan]}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #4e73df; padding: 20px; color: white; text-align: center;">
                    <h2 style="margin: 0;">Email Campaign Tool</h2>
                  </div>
                  <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
                    <h3>New Plan Upgrade Request</h3>
                    <p><strong>User:</strong> ${user.name || 'N/A'} (${user.email})</p>
                    <p><strong>Current Plan:</strong> ${planNames[user.plan]}</p>
                    <p><strong>Requested Plan:</strong> ${planNames[requestedPlan]}</p>
                    <p><strong>User Message:</strong></p>
                    <div style="padding: 10px; background-color: #f8f9fc; border-left: 4px solid #4e73df;">
                      ${message}
                    </div>
                    <p style="margin-top: 20px;">
                      <a href="${process.env.APP_URL || 'http://localhost:5000'}/client/admin/dashboard.html" 
                        style="background-color: #4e73df; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
                        Review Request
                      </a>
                    </p>
                  </div>
                  <div style="background-color: #f8f9fc; padding: 15px; text-align: center; font-size: 12px; color: #858796;">
                    &copy; ${new Date().getFullYear()} Email Campaign Tool. All rights reserved.
                  </div>
                </div>
              `
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending admin notification:', emailError);
        // Continue execution even if email fails
      }
      
      res.status(201).json({
        message: 'Plan upgrade request submitted successfully',
        requestId: planRequest._id
      });
      
    } catch (error) {
      console.error('Error creating plan request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get user's plan requests
router.get('/plan-requests', auth, async (req, res) => {
  try {
    const planRequests = await PlanRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(planRequests);
  } catch (error) {
    console.error('Error fetching plan requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;