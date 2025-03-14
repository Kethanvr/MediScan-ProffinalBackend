import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models
import User from '../models/User.js';
import Medication from '../models/Medication.js';
import DrugInteraction from '../models/DrugInteraction.js';
import HealthRecommendation from '../models/HealthRecommendation.js';
import ChatHistory from '../models/ChatHistory.js';
import Scan from '../models/Scan.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'mediscan',
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Export models
    const models = {
      User,
      Medication,
      DrugInteraction,
      HealthRecommendation,
      ChatHistory,
      Scan
    };

    // Add event listeners for the connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Return both the connection and models
    return { connection: conn, models };

  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Implement exponential backoff for retries
    const retryConnection = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const conn = await mongoose.connect(process.env.MONGO_URI);
          console.log(`MongoDB Connected after retry: ${conn.connection.host}`);
          return conn;
        } catch (retryError) {
          console.error(`Retry ${i + 1} failed:`, retryError.message);
          if (i < retries - 1) {
            const waitTime = delay * Math.pow(2, i);
            console.log(`Waiting ${waitTime}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      throw new Error('Failed to connect to MongoDB after multiple retries');
    };

    return retryConnection();
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB shutdown:', err);
    process.exit(1);
  }
});

export default connectDB;
