const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const Campaign = require('../models/Campaign');
const List = require('../models/List');
const Template = require('../models/Template');
const User = require('../models/User');

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized successfully');
}

// Track scheduled jobs by campaign ID
const scheduledJobs = new Map();

// Create a function to get a test account from Ethereal
const getTestAccount = async () => {
  try {
    // Use existing test account if available in env vars
    if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
      return {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS
      };
    }
    
    // Otherwise create a new test account
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Created Ethereal test account:');
    console.log(`Email: ${testAccount.user}`);
    console.log(`Password: ${testAccount.pass}`);
    
    return testAccount;
  } catch (error) {
    console.error('Error creating test account:', error);
    throw error;
  }
};

// Create a reusable transporter
let transporter = null;
const createTransporter = async () => {
  if (transporter) return transporter;
  
  try {
    const testAccount = await getTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // TLS
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Create a user-specific transporter if they have SMTP settings
const createUserTransporter = (user) => {
  if (user?.settings?.smtp?.enabled && 
      user.settings.smtp.host && 
      user.settings.smtp.auth?.user && 
      user.settings.smtp.auth?.pass) {
    
    console.log(`Creating custom SMTP transporter for user ${user.email}`);
    
    return nodemailer.createTransport({
      host: user.settings.smtp.host,
      port: user.settings.smtp.port || 587,
      secure: user.settings.smtp.secure || false,
      auth: {
        user: user.settings.smtp.auth.user,
        pass: user.settings.smtp.auth.pass
      }
    });
  }
  
  return null;
};

// Process a single email
const processEmail = async (subscriber, campaign, template, user) => {
  try {
    // Replace template placeholders with subscriber data
    let emailContent = template.content;
    let emailSubject = template.subject;
    
    // Replace basic placeholders
    emailContent = emailContent
      .replace(/{{firstName}}/g, subscriber.firstName || '')
      .replace(/{{lastName}}/g, subscriber.lastName || '')
      .replace(/{{email}}/g, subscriber.email)
      .replace(/{{unsubscribe}}/g, 'https://example.com/unsubscribe?email=' + encodeURIComponent(subscriber.email));
    
    emailSubject = emailSubject
      .replace(/{{firstName}}/g, subscriber.firstName || '')
      .replace(/{{lastName}}/g, subscriber.lastName || '')
      .replace(/{{email}}/g, subscriber.email);
    
    // Get sender name and reply-to from user settings or use defaults
    const senderName = user.settings?.senderName || 'Email Campaign Tool';
    const replyToEmail = user.settings?.replyToEmail || user.email;
    
    // First try to use the user's custom SMTP settings
    let userTransporter = createUserTransporter(user);
    let fromEmail;
    let previewUrl = null;
    let info;
    
    if (userTransporter) {
      // Use user's custom email 
      fromEmail = user.settings.smtp.auth.user;
      
      // Send the email with user's SMTP settings
      const mailOptions = {
        from: `"${senderName}" <${fromEmail}>`,
        to: subscriber.email,
        subject: emailSubject,
        html: emailContent,
        replyTo: replyToEmail
      };
      
      info = await userTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${subscriber.email} using custom SMTP`);
      
      // Return result with success
      return { 
        success: true, 
        messageId: info.messageId,
        provider: 'custom_smtp',
        smtpHost: user.settings.smtp.host
      };
    } else {
      // Fall back to Ethereal for testing
      const emailTransporter = await createTransporter();
      
      // Send the email
      const mailOptions = {
        from: `"${senderName}" <${emailTransporter.options.auth.user}>`,
        to: subscriber.email,
        subject: emailSubject,
        html: emailContent,
        replyTo: replyToEmail
      };
      
      info = await emailTransporter.sendMail(mailOptions);
      
      // For Ethereal, get the URL where the email can be viewed
      previewUrl = nodemailer.getTestMessageUrl(info);
      
      // Log information
      console.log(`Email sent to ${subscriber.email} using Ethereal`);
      console.log(`Preview URL: ${previewUrl}`);
      
      return { 
        success: true, 
        messageId: info.messageId,
        previewUrl: previewUrl,
        provider: 'ethereal'
      };
    }
  } catch (error) {
    console.error(`Error sending email to ${subscriber.email}:`, error);
    return { success: false, error: error.message };
  }
};

// Process a batch of emails for a campaign
const processBatch = async (campaignId, batchSize) => {
  try {
    // Get the campaign with populated references
    const campaign = await Campaign.findById(campaignId)
      .populate('list')
      .populate('template')
      .populate('user');
    
    if (!campaign || campaign.status !== 'sending') {
      console.log(`Campaign ${campaignId} is no longer active`);
      return;
    }
    
    // Calculate how many emails we can still send
    const remainingEmails = campaign.totalRecipients - campaign.sentCount;
    const batchToSend = Math.min(batchSize, remainingEmails);
    
    if (batchToSend <= 0) {
      // All emails have been sent
      campaign.status = 'sent';
      await campaign.save();
      console.log(`Campaign ${campaignId} completed`);
      return;
    }
    
    // Get the subscribers for this batch
    const startIndex = campaign.sentCount;
    const endIndex = startIndex + batchToSend;
    const subscribers = campaign.list.subscribers.slice(startIndex, endIndex);
    
    // Process each email in the batch
    for (const subscriber of subscribers) {
      const result = await processEmail(
        subscriber, 
        campaign, 
        campaign.template, 
        campaign.user
      );
      
      // Update counts based on result
      if (result.success) {
        campaign.sentCount += 1;
      } else {
        campaign.bounceCount += 1;
      }
    }
    
    // Update the campaign
    campaign.lastSentAt = new Date();
    
    // Check if we're done
    if (campaign.sentCount >= campaign.totalRecipients) {
      campaign.status = 'sent';
      console.log(`Campaign ${campaignId} completed`);
    }
    
    await campaign.save();
    
    // For demo purposes, let's simulate some opens and clicks
    if (campaign.sentCount > 0) {
      // Simulate 40% open rate and 10% click rate
      const openCount = Math.floor(campaign.sentCount * 0.4);
      const clickCount = Math.floor(campaign.sentCount * 0.1);
      
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: {
          openCount,
          clickCount
        }
      });
    }
    
    console.log(`Processed batch for campaign ${campaignId}: ${batchToSend} emails`);
  } catch (error) {
    console.error(`Error processing batch for campaign ${campaignId}:`, error);
    
    // Mark campaign as failed if there was an error
    await Campaign.findByIdAndUpdate(campaignId, {
      $set: {
        status: 'failed'
      }
    });
  }
};

// Schedule a campaign
const scheduleCampaign = async (campaign) => {
  try {
    const now = new Date();
    const scheduleDate = new Date(campaign.scheduleDate);
    
    // If the schedule date is in the past, start right away
    if (scheduleDate <= now) {
      console.log(`Starting campaign ${campaign._id} immediately`);
      
      // Update campaign status
      await Campaign.findByIdAndUpdate(campaign._id, {
        $set: {
          status: 'sending'
        }
      });
      
      // Start processing
      processBatch(campaign._id, campaign.sendLimit);
    } else {
      // Schedule the campaign for the future
      console.log(`Scheduling campaign ${campaign._id} for ${scheduleDate}`);
      
      // Calculate milliseconds until the scheduled time
      const delay = scheduleDate.getTime() - now.getTime();
      
      // Schedule the job
      const timeoutId = setTimeout(async () => {
        // Update campaign status
        await Campaign.findByIdAndUpdate(campaign._id, {
          $set: {
            status: 'sending'
          }
        });
        
        // Start processing
        processBatch(campaign._id, campaign.sendLimit);
        
        // Remove from scheduled jobs
        scheduledJobs.delete(campaign._id.toString());
      }, delay);
      
      // Store the timeout ID so we can cancel it if needed
      scheduledJobs.set(campaign._id.toString(), timeoutId);
    }
  } catch (error) {
    console.error(`Error scheduling campaign ${campaign._id}:`, error);
  }
};

// Cancel a scheduled campaign
const cancelCampaign = (campaignId) => {
  const timeoutId = scheduledJobs.get(campaignId.toString());
  
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledJobs.delete(campaignId.toString());
    console.log(`Cancelled scheduled campaign ${campaignId}`);
  }
};

// Initialize the service - check for any scheduled campaigns
const initService = async () => {
  try {
    console.log('Initializing email service...');
    
    // Find any scheduled campaigns
    const scheduledCampaigns = await Campaign.find({
      status: 'scheduled',
      scheduleDate: { $gt: new Date() }
    });
    
    // Schedule each campaign
    scheduledCampaigns.forEach(campaign => {
      scheduleCampaign(campaign);
    });
    
    console.log(`Scheduled ${scheduledCampaigns.length} pending campaigns`);
  } catch (error) {
    console.error('Error initializing email service:', error);
  }
};

// Initialize the service when the module is loaded
initService();

// Send a test email using user's SMTP settings, SendGrid, or Ethereal
const sendTestEmail = async (templateId, recipientEmail, userId) => {
  try {
    // Get the template, user, and create a test subscriber
    const template = await Template.findById(templateId);
    const user = await User.findById(userId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create a test subscriber with the provided email
    const testSubscriber = {
      email: recipientEmail,
      firstName: 'Test',
      lastName: 'User',
      status: 'active'
    };
    
    // Replace template placeholders with subscriber data
    let emailContent = template.content;
    let emailSubject = template.subject;
    
    // Replace basic placeholders
    emailContent = emailContent
      .replace(/{{firstName}}/g, testSubscriber.firstName || '')
      .replace(/{{lastName}}/g, testSubscriber.lastName || '')
      .replace(/{{email}}/g, testSubscriber.email)
      .replace(/{{unsubscribe}}/g, 'https://example.com/unsubscribe?email=' + encodeURIComponent(testSubscriber.email));
    
    emailSubject = emailSubject
      .replace(/{{firstName}}/g, testSubscriber.firstName || '')
      .replace(/{{lastName}}/g, testSubscriber.lastName || '')
      .replace(/{{email}}/g, testSubscriber.email);
    
    // Get sender name and reply-to from user settings or use defaults
    const senderName = user.settings?.senderName || 'Email Campaign Tool';
    const replyToEmail = user.settings?.replyToEmail || user.email;

    // First, try to use user's SMTP settings if available
    const userTransporter = createUserTransporter(user);
    if (userTransporter) {
      try {
        console.log(`Sending test email via user's SMTP settings (${user.settings.smtp.host})`);
        
        // Use user's custom email settings
        const fromEmail = user.settings.smtp.auth.user;
        
        // Send the test email with user's SMTP
        const mailOptions = {
          from: `"${senderName}" <${fromEmail}>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailContent,
          replyTo: replyToEmail
        };
        
        const info = await userTransporter.sendMail(mailOptions);
        
        console.log(`Custom SMTP test email sent to ${recipientEmail}`);
        
        return {
          success: true,
          messageId: info.messageId,
          provider: 'custom_smtp',
          smtpHost: user.settings.smtp.host,
          previewUrl: null // Custom SMTP doesn't provide preview URLs
        };
      } catch (smtpError) {
        console.error('Custom SMTP error:', smtpError);
        // If custom SMTP fails, continue to next options
      }
    }

    // Second, try SendGrid if available
    if (process.env.SENDGRID_API_KEY) {
      try {
        console.log('Sending test email via SendGrid');
        
        // Prepare the SendGrid message
        const msg = {
          to: recipientEmail,
          from: {
            email: 'noreply@emailcampaigntool.com',
            name: senderName
          },
          subject: emailSubject,
          html: emailContent,
          replyTo: replyToEmail
        };
        
        // Send email with SendGrid
        await sgMail.send(msg);
        
        console.log(`SendGrid test email sent to ${recipientEmail}`);
        
        return {
          success: true,
          messageId: `sg_${Date.now()}`,
          provider: 'sendgrid',
          previewUrl: null // SendGrid doesn't provide preview URLs
        };
      } catch (sgError) {
        console.error('SendGrid error:', sgError);
        // If SendGrid fails, fall back to Ethereal
      }
    }
    
    // Finally, fall back to Ethereal for testing
    console.log('Using Ethereal for test email');
    
    // Create Ethereal transporter
    const emailTransporter = await createTransporter();
    
    // Send the email
    const mailOptions = {
      from: `"${senderName}" <${emailTransporter.options.auth.user}>`,
      to: recipientEmail,
      subject: emailSubject,
      html: emailContent,
      replyTo: replyToEmail
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    
    // For Ethereal, get the URL where the email can be viewed
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    // Log information
    console.log(`Ethereal test email sent to ${recipientEmail}`);
    console.log(`Preview URL: ${previewUrl}`);
    
    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl,
      provider: 'ethereal'
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

module.exports = {
  scheduleCampaign,
  cancelCampaign,
  processBatch,
  sendTestEmail
};
