const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const List = require('../models/List');
const Template = require('../models/Template');
const PlanRequest = require('../models/PlanRequest');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');
const os = require('os');
const mongoose = require('mongoose');

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Admin only
router.get('/stats', auth, admin, async (req, res) => {
  try {
    // Get counts for dashboard stats
    const userCount = await User.countDocuments({ role: 'user' });
    const campaignCount = await Campaign.countDocuments();
    const listCount = await List.countDocuments();
    const templateCount = await Template.countDocuments();
    
    // Get user registration stats for chart
    const userStats = await User.aggregate([
      { 
        $match: { role: 'user' } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt" 
            } 
          },
          count: { $sum: 1 }
        }
      },
      { 
        $sort: { _id: 1 } 
      },
      { 
        $limit: 30 
      }
    ]);
    
    // Get plans distribution
    const planStats = await User.aggregate([
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('email name plan createdAt lastLogin');
    
    res.json({
      stats: {
        userCount,
        campaignCount,
        listCount,
        templateCount
      },
      userStats: userStats.map(stat => ({
        date: stat._id,
        count: stat.count
      })),
      planStats: planStats.map(stat => ({
        plan: stat._id,
        count: stat.count
      })),
      recentUsers
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Admin only
router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/admin/users/:id
// @desc    Get user by ID
// @access  Admin only
router.get('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user details
// @access  Admin only
router.put('/users/:id', auth, admin, async (req, res) => {
  try {
    const { name, email, plan, role } = req.body;
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent changing the current admin's role
    if (req.params.id === req.user.id && role && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own admin role' });
    }
    
    // Update user fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    
    // Update plan and plan details if provided
    if (plan) {
      user.plan = plan;
      
      // Set plan limits based on the selected plan
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
      
      // Reset subscription dates
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
      
      user.planDetails = {
        ...planLimits[plan],
        subscriptionStartDate: new Date(),
        subscriptionEndDate: plan === 'free' ? null : subscriptionEndDate
      };
    }
    
    // Update role if provided (except for self)
    if (role && req.params.id !== req.user.id) {
      user.role = role;
    }
    
    await user.save();
    
    // Return the updated user (without password)
    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user
// @access  Admin only
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all user data
    await Campaign.deleteMany({ user: req.params.id });
    await List.deleteMany({ user: req.params.id });
    await Template.deleteMany({ user: req.params.id });
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/admin/system-stats
// @desc    Get system statistics
// @access  Admin only
router.get('/system-stats', auth, admin, async (req, res) => {
  try {
    // Get system uptime
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    // Get memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = Math.round((usedMem / totalMem) * 100);
    
    // Get CPU info
    const cpuCores = os.cpus().length;
    const loadAvg = os.loadavg()[0]; // 1 minute load average
    const cpuPercentage = Math.min(Math.round((loadAvg / cpuCores) * 100), 100);
    
    // Get active connections - this is a simplified example
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 1000 * 60 * 15) } });
    
    // Send system stats
    res.json({
      success: true,
      data: {
        uptime: {
          days,
          hours,
          minutes
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: memPercentage
        },
        cpu: {
          cores: cpuCores,
          load: cpuPercentage
        },
        connections: {
          total: activeUsers + 5, // Adding some buffer for non-user connections
          active: activeUsers
        }
      }
    });
  } catch (err) {
    console.error('Get system stats error:', err.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// @route   GET api/admin/db-stats
// @desc    Get database statistics
// @access  Admin only
router.get('/db-stats', auth, admin, async (req, res) => {
  try {
    // Get collection stats
    const collections = [
      { name: 'Users', count: await User.countDocuments(), status: 'healthy' },
      { name: 'Campaigns', count: await Campaign.countDocuments(), status: 'healthy' },
      { name: 'Templates', count: await Template.countDocuments(), status: 'healthy' },
      { name: 'Lists', count: await List.countDocuments(), status: 'healthy' },
      { name: 'PlanRequests', count: await PlanRequest.countDocuments(), status: 'healthy' }
    ];
    
    // Add some size estimates - these would be more accurate in a real system
    collections.forEach(collection => {
      // Rough estimate based on document count
      const avgDocSize = collection.name === 'Templates' ? 8192 : 2048; // Templates are larger
      collection.size = collection.count * avgDocSize;
    });
    
    res.json({
      success: true,
      data: collections
    });
  } catch (err) {
    console.error('Get database stats error:', err.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// @route   GET api/admin/logs
// @desc    Get system logs
// @access  Admin only
router.get('/logs', auth, admin, async (req, res) => {
  try {
    // Get query parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    // In a real system, these would come from a logs database or file
    // This is a demonstration with generated logs
    const systemLogs = generateSystemLogs(startDate, endDate);
    
    // Paginate logs
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLogs = systemLogs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      logs: paginatedLogs,
      totalLogs: systemLogs.length,
      page,
      pages: Math.ceil(systemLogs.length / limit)
    });
  } catch (err) {
    console.error('Get logs error:', err.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// @route   POST api/admin/impersonate/:id
// @desc    Impersonate a user
// @access  Admin only
router.post('/impersonate/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create a special impersonation token
    const payload = {
      user: {
        id: user.id,
        impersonatedBy: req.user.id
      }
    };
    
    const jwt = require('jsonwebtoken');
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jwt-secret-token',
      { expiresIn: '1h' }, // Limited time for security
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Impersonate user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/admin/plan-requests/respond
// @desc    Respond to a plan change request
// @access  Admin only
router.post('/plan-requests/respond', 
  [
    auth, 
    admin,
    check('requestId', 'Request ID is required').not().isEmpty(),
    check('approved', 'Approval status is required').isBoolean()
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestId, approved, message } = req.body;

    try {
      // Find the plan request
      const planRequest = await PlanRequest.findById(requestId).populate('user');
      
      if (!planRequest) {
        return res.status(404).json({ message: 'Plan request not found' });
      }
      
      // Update the plan request status
      planRequest.status = approved ? 'approved' : 'rejected';
      planRequest.adminMessage = message || '';
      planRequest.adminResponse = {
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
      
      // If approved, update the user's plan, but only if user still exists
      if (approved && planRequest.user) {
        const user = planRequest.user;
        const plan = planRequest.requestedPlan;
        
        // Set plan
        user.plan = plan;
        
        // Set plan limits based on the selected plan
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
        
        user.planDetails = {
          ...planLimits[plan],
          subscriptionStartDate: new Date(),
          subscriptionEndDate: plan === 'free' ? null : subscriptionEndDate
        };
        
        await user.save();
      } else if (approved && !planRequest.user) {
        console.warn('Cannot update plan for deleted user');
      }
      
      // Send email notification to user about plan request status, but only if user still exists
      if (planRequest.user) {
        try {
          // Get SMTP settings from admin user or use defaults
          const adminUser = await User.findById(req.user.id);
          let smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: 'noreply@example.com',
              pass: 'password'
            }
          };
          
          // Use admin's SMTP settings if available
          if (adminUser.settings && adminUser.settings.smtp && adminUser.settings.smtp.enabled) {
            smtpConfig = {
              host: adminUser.settings.smtp.host,
              port: adminUser.settings.smtp.port,
              secure: adminUser.settings.smtp.secure,
              auth: {
                user: adminUser.settings.smtp.auth.user,
                pass: adminUser.settings.smtp.auth.pass
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
          
          const requestedPlan = planRequest.requestedPlan;
          const user = planRequest.user; // Store user in local variable for cleaner access
          
          const emailSubject = approved 
            ? `Your request for ${planNames[requestedPlan]} has been approved!` 
            : `Update on your ${planNames[requestedPlan]} request`;
          
          const emailContent = approved
            ? `<p>Good news! Your request to upgrade to the <strong>${planNames[requestedPlan]}</strong> has been approved.</p>
               <p>You now have access to all the features and benefits of this plan. Your new plan is active immediately.</p>
               <p>Thank you for choosing our service!</p>
               ${message ? `<p><strong>Admin message:</strong> ${message}</p>` : ''}`
            : `<p>We've reviewed your request to upgrade to the <strong>${planNames[requestedPlan]}</strong>.</p>
               <p>Unfortunately, we were not able to approve your request at this time.</p>
               ${message ? `<p><strong>Admin message:</strong> ${message}</p>` : ''}
               <p>If you have any questions, please reply to this email for assistance.</p>`;
          
          await transporter.sendMail({
            from: `"Email Campaign Tool" <${smtpConfig.auth.user}>`,
            to: user.email,
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #4e73df; padding: 20px; color: white; text-align: center;">
                  <h2 style="margin: 0;">Email Campaign Tool</h2>
                </div>
                <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
                  <p>Hello ${user.name || user.email},</p>
                  ${emailContent}
                  <p style="margin-top: 30px;">Best regards,<br>The Email Campaign Team</p>
                </div>
                <div style="background-color: #f8f9fc; padding: 15px; text-align: center; font-size: 12px; color: #858796;">
                  &copy; ${new Date().getFullYear()} Email Campaign Tool. All rights reserved.
                </div>
              </div>
            `
          });
          
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          // Continue execution even if email fails
        }
      } else {
        console.warn('Cannot send notification email - user no longer exists');
      }
      
      // Save the plan request changes
      await planRequest.save();
      
      let responseData = {
        message: `Plan request ${approved ? 'approved' : 'rejected'} successfully`
      };
      
      // Add plan info to response if available
      if (approved) {
        responseData.plan = planRequest.requestedPlan;
      } else if (planRequest.user) {
        responseData.plan = planRequest.user.plan;
      }
      
      res.json(responseData);
      
    } catch (err) {
      console.error('Plan request response error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/admin/plan-requests
// @desc    Get all plan change requests
// @access  Admin only
router.get('/plan-requests', auth, admin, async (req, res) => {
  try {
    // Get all plan requests with user information
    const planRequests = await PlanRequest.find()
      .sort({ createdAt: -1 })
      .populate('user', 'email name');
    
    // Format the response
    const formattedRequests = planRequests.map(request => {
      // Handle null user (user might have been deleted)
      if (!request.user) {
        return {
          id: request._id,
          userId: null,
          userEmail: 'User Deleted',
          userName: 'User Deleted',
          currentPlan: request.currentPlan,
          requestedPlan: request.requestedPlan,
          requestDate: request.createdAt,
          status: request.status,
          message: request.message,
          adminMessage: request.adminMessage,
          adminResponse: request.adminResponse
        };
      }
      
      return {
        id: request._id,
        userId: request.user._id,
        userEmail: request.user.email,
        userName: request.user.name,
        currentPlan: request.currentPlan,
        requestedPlan: request.requestedPlan,
        requestDate: request.createdAt,
        status: request.status,
        message: request.message,
        adminMessage: request.adminMessage,
        adminResponse: request.adminResponse
      };
    });
    
    res.json(formattedRequests);
  } catch (err) {
    console.error('Get plan requests error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Generate system logs for demonstration purposes
 * @param {Date} startDate - Start date for logs
 * @param {Date} endDate - End date for logs
 * @returns {Array} Array of log entries
 */
function generateSystemLogs(startDate, endDate) {
  const logs = [];
  const sources = [
    'System', 'Authentication', 'Database', 'Email Service', 
    'Campaign Manager', 'User Service', 'API Gateway', 'File System'
  ];
  
  const infoMessages = [
    'Server started successfully',
    'Database connection established',
    'Email campaign scheduled',
    'User logged in',
    'Admin action: user updated',
    'Backup completed successfully',
    'API rate limit configuration updated',
    'New template created',
    'Subscriber added to list',
    'System configuration updated'
  ];
  
  const warningMessages = [
    'High CPU usage detected',
    'Memory usage approaching threshold',
    'Slow database query detected',
    'Multiple failed login attempts',
    'Email delivery rate decreasing',
    'Low disk space warning',
    'API rate limit warning',
    'Outdated browser detected',
    'SMTP connection timeout - retrying',
    'Session store cleanup overdue'
  ];
  
  const errorMessages = [
    'Database connection failed',
    'Email sending failed',
    'API request timeout',
    'Authentication error',
    'File upload failed',
    'Template rendering error',
    'Subscriber import failed',
    'Campaign scheduling conflict',
    'Storage quota exceeded',
    'SMTP configuration error'
  ];
  
  const successMessages = [
    'Email campaign sent successfully',
    'Database backup created',
    'User password changed',
    'Account verified',
    'Plan upgraded successfully',
    'API key rotated',
    'System update applied',
    'New integration connected',
    'Security scan completed',
    'Reports generated successfully'
  ];
  
  // Generate random logs within date range
  const range = endDate.getTime() - startDate.getTime();
  const numLogs = Math.min(Math.floor(range / 3600000) + 10, 200); // Reasonable number of logs
  
  for (let i = 0; i < numLogs; i++) {
    const timestamp = new Date(startDate.getTime() + Math.random() * range);
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    // Determine log level with weighted randomness
    const rand = Math.random();
    let level, message;
    
    if (rand < 0.6) { // 60% info
      level = 'info';
      message = infoMessages[Math.floor(Math.random() * infoMessages.length)];
    } else if (rand < 0.8) { // 20% warning
      level = 'warning';
      message = warningMessages[Math.floor(Math.random() * warningMessages.length)];
    } else if (rand < 0.95) { // 15% error
      level = 'error';
      message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    } else { // 5% success
      level = 'success';
      message = successMessages[Math.floor(Math.random() * successMessages.length)];
    }
    
    // Add some contextual data for some logs
    let data = null;
    if (Math.random() < 0.3) { // 30% of logs have additional data
      if (message.includes('User') || message.includes('Authentication')) {
        data = {
          userId: '6123456789abcdef01234567',
          email: 'user@example.com',
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 255)
        };
      } else if (message.includes('Email') || message.includes('Campaign')) {
        data = {
          campaignId: '6123456789abcdef01234568',
          recipients: Math.floor(Math.random() * 1000),
          deliveryRate: (85 + Math.random() * 15).toFixed(2) + '%'
        };
      } else if (message.includes('Database')) {
        data = {
          queryTime: (Math.random() * 500).toFixed(2) + 'ms',
          collection: ['users', 'campaigns', 'templates', 'subscribers'][Math.floor(Math.random() * 4)],
          operations: Math.floor(Math.random() * 100)
        };
      }
    }
    
    logs.push({
      timestamp,
      level,
      source,
      message,
      data
    });
  }
  
  // Sort logs by timestamp (newest first)
  logs.sort((a, b) => b.timestamp - a.timestamp);
  
  return logs;
}

module.exports = router;