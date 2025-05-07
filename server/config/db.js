const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Get the MongoDB URI from environment variables or use MongoDB Atlas free tier
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.mongodb.net/email-campaign-tool?retryWrites=true&w=majority';
    
    // Connect to MongoDB using Mongoose
    const conn = await mongoose.connect(mongoURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
