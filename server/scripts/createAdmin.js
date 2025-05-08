/**
 * This script creates an admin user for the Email Campaign Tool
 * 
 * Usage:
 * node createAdmin.js <email> <password> <name>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin User';

// Validate arguments
if (!email || !password) {
  console.error('Usage: node createAdmin.js <email> <password> [name]');
  process.exit(1);
}

// Create admin user
async function createAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`Admin user ${email} already exists. Setting new password and details.`);
        
        // Update existing admin
        existingUser.password = password; // Will be hashed via pre-save hook
        existingUser.name = name;
        await existingUser.save();
        
        console.log(`Admin user ${email} updated successfully.`);
      } else {
        console.log(`User ${email} exists but is not an admin. Promoting to admin.`);
        
        // Promote to admin
        existingUser.role = 'admin';
        existingUser.password = password; // Will be hashed via pre-save hook
        existingUser.name = name;
        await existingUser.save();
        
        console.log(`User ${email} promoted to admin successfully.`);
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        email,
        password, // Will be hashed via pre-save hook
        name,
        role: 'admin',
        plan: 'enterprise', // Admins get enterprise features
        planDetails: {
          emailsPerList: 500,
          emailsPerHour: 800,
          emailsPerDay: 2000,
          emailsPerMonth: 50000
        }
      });
      
      await adminUser.save();
      console.log(`Admin user ${email} created successfully.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();