const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string from the .env file.
 * Exits the process if the connection fails so the error is obvious.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';

    const conn = await mongoose.connect(uri, {
      // Mongoose 8 uses the new connection engine by default,
      // so no extra options are required here.
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Exit with failure so the app does not run without a database.
    process.exit(1);
  }
};

module.exports = connectDB;
