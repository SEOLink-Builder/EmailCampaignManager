const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const List = require('../models/List');
const User = require('../models/User');

// @route   GET api/analytics
// @desc    Get analytics data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get query parameters for date filtering
    const { startDate, endDate } = req.query;
    
    // Build filter for date range
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (!dateFilter.createdAt) dateFilter.createdAt = {};
      dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get all campaigns for this user within date range
    const userFilter = { user: req.user.id, ...dateFilter };
    const campaigns = await Campaign.find(userFilter).populate('list');
    
    // Get all lists for this user
    const lists = await List.find({ user: req.user.id });
    
    // Calculate summary statistics
    const totalSubscribers = lists.reduce((sum, list) => sum + list.subscribers.length, 0);
    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
    
    // Calculate average rates
    let avgOpenRate = 0;
    let avgClickRate = 0;
    let avgBounceRate = 0;
    
    if (campaigns.length > 0 && totalSent > 0) {
      const totalOpens = campaigns.reduce((sum, campaign) => sum + (campaign.openCount || 0), 0);
      const totalClicks = campaigns.reduce((sum, campaign) => sum + (campaign.clickCount || 0), 0);
      const totalBounces = campaigns.reduce((sum, campaign) => sum + (campaign.bounceCount || 0), 0);
      
      avgOpenRate = Math.round((totalOpens / totalSent) * 100);
      avgClickRate = Math.round((totalClicks / totalSent) * 100);
      avgBounceRate = Math.round((totalBounces / totalSent) * 100);
    }
    
    // Prepare timeline data
    const timelineDates = [];
    const timelineOpenRates = [];
    const timelineClickRates = [];
    
    // Sort campaigns by date
    const sortedCampaigns = [...campaigns].sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));
    
    // Extract timeline data from campaigns
    sortedCampaigns.forEach(campaign => {
      if (campaign.status === 'sent' && campaign.sentCount > 0) {
        const date = new Date(campaign.scheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const openRate = Math.round((campaign.openCount || 0) / campaign.sentCount * 100);
        const clickRate = Math.round((campaign.clickCount || 0) / campaign.sentCount * 100);
        
        timelineDates.push(date);
        timelineOpenRates.push(openRate);
        timelineClickRates.push(clickRate);
      }
    });
    
    // Gather actual data for list growth
    const months = [];
    const newSubscribers = [];
    const totalSubscribersByMonth = [];
    
    // Only include if we have actual data
    if (lists.length > 0) {
      // Get the last 6 months
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(month.toLocaleDateString('en-US', { month: 'short' }));
      }
      
      // Calculate new subscribers per month
      let runningTotal = 0;
      months.forEach((month, index) => {
        // In a real app, we would query the database for subscribers created in each month
        // For the beta, we'll use zeros since we don't have that historical data
        newSubscribers.push(0);
        runningTotal += 0;
        totalSubscribersByMonth.push(runningTotal);
      });
    }
    
    // Real device usage data (or empty if none)
    const deviceUsage = {
      'Mobile': 0,
      'Desktop': 0,
      'Tablet': 0,
      'Other': 0
    };
    
    // Calculate email engagement
    const openCount = campaigns.reduce((sum, campaign) => sum + (campaign.openCount || 0), 0);
    const clickCount = campaigns.reduce((sum, campaign) => sum + (campaign.clickCount || 0), 0);
    const bounceCount = campaigns.reduce((sum, campaign) => sum + (campaign.bounceCount || 0), 0);
    const notOpenedCount = totalSent - openCount - bounceCount;
    
    // Prepare the response
    const analyticsData = {
      summary: {
        totalSubscribers,
        totalCampaigns,
        totalSent,
        avgOpenRate,
        avgClickRate,
        avgBounceRate
      },
      timeline: {
        dates: timelineDates,
        openRates: timelineOpenRates,
        clickRates: timelineClickRates
      },
      listGrowth: {
        months,
        newSubscribers,
        totalSubscribers: totalSubscribersByMonth
      },
      deviceUsage,
      engagement: {
        openCount,
        clickCount,
        bounceCount,
        notOpenedCount
      }
    };
    
    res.json(analyticsData);
  } catch (err) {
    console.error('Get analytics error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/analytics/campaigns
// @desc    Get campaign performance data
// @access  Private
router.get('/campaigns', auth, async (req, res) => {
  try {
    // Get all sent campaigns for this user
    const campaigns = await Campaign.find({
      user: req.user.id,
      status: 'sent'
    }).sort({ scheduleDate: -1 });
    
    // Format the campaign data for the table
    const campaignData = campaigns.map(campaign => {
      // Calculate rates
      const openRate = campaign.sentCount ? Math.round((campaign.openCount || 0) / campaign.sentCount * 100) : 0;
      const clickRate = campaign.sentCount ? Math.round((campaign.clickCount || 0) / campaign.sentCount * 100) : 0;
      const bounceRate = campaign.sentCount ? Math.round((campaign.bounceCount || 0) / campaign.sentCount * 100) : 0;
      
      return {
        id: campaign._id,
        name: campaign.name,
        sent: campaign.sentCount || 0,
        openRate,
        clickRate,
        bounceRate,
        date: campaign.scheduleDate
      };
    });
    
    res.json(campaignData);
  } catch (err) {
    console.error('Get campaign performance error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    // Get counts
    const listCount = await List.countDocuments({ user: req.user.id });
    const campaignCount = await Campaign.countDocuments({ user: req.user.id });
    
    // Get all lists for subscriber count
    const lists = await List.find({ user: req.user.id });
    const subscriberCount = lists.reduce((sum, list) => sum + list.subscribers.length, 0);
    
    // Get sent campaigns for statistics
    const campaigns = await Campaign.find({ 
      user: req.user.id,
      status: 'sent'
    });
    
    // Calculate statistics
    const sentCount = campaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
    let openRate = 0;
    
    if (campaigns.length > 0 && sentCount > 0) {
      const opens = campaigns.reduce((sum, campaign) => sum + (campaign.openCount || 0), 0);
      openRate = Math.round((opens / sentCount) * 100);
    }
    
    res.json({
      totalSubscribers: subscriberCount,
      totalCampaigns: campaignCount,
      totalSent: sentCount,
      openRate
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/dashboard/recent-activity
// @desc    Get recent activity
// @access  Private
router.get('/recent-activity', auth, async (req, res) => {
  try {
    // Get recent campaigns
    const campaigns = await Campaign.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(3);
    
    // Get recent lists
    const lists = await List.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(3);
    
    // Combine and format activities
    const activities = [];
    
    // Add campaign activities
    campaigns.forEach(campaign => {
      activities.push({
        type: 'campaign',
        title: `Campaign: ${campaign.name}`,
        description: `Status: ${campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}`,
        timestamp: campaign.createdAt
      });
    });
    
    // Add list activities
    lists.forEach(list => {
      activities.push({
        type: 'list',
        title: `List: ${list.name}`,
        description: `${list.subscribers.length} subscribers`,
        timestamp: list.createdAt
      });
    });
    
    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 5 activities
    const limitedActivities = activities.slice(0, 5);
    
    res.json(limitedActivities);
  } catch (err) {
    console.error('Get recent activity error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
