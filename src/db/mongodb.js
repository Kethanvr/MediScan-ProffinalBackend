import mongoose from "mongoose";
import dotenv from "dotenv";

// Import models
import User from "../models/User.js";
import Medication from "../models/Medication.js";
import DrugInteraction from "../models/DrugInteraction.js";
import HealthRecommendation from "../models/HealthRecommendation.js";
import ChatHistory from "../models/ChatHistory.js";
import Scan from "../models/Scan.js";
import HealthRecord from "../models/HealthRecord.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "mediscan",
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      retryReads: true,
      w: "majority",
      wtimeout: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Export models
    const models = {
      User,
      Medication,
      DrugInteraction,
      HealthRecommendation,
      ChatHistory,
      Scan,
      HealthRecord,
    };

    // Add event listeners for the connection
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
      setTimeout(() => {
        connectDB().catch((err) => console.error("Reconnection failed:", err));
      }, 5000);
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

    // Return both the connection and models
    return { connection: conn, models };
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Implement exponential backoff for retries
    const retryConnection = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(
            `Attempting to connect to MongoDB (attempt ${i + 1}/${retries})...`
          );
          const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: "mediscan",
            autoIndex: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            retryReads: true,
            w: "majority",
            wtimeout: 10000,
            connectTimeoutMS: 10000,
          });
          console.log(`MongoDB Connected after retry: ${conn.connection.host}`);
          return conn;
        } catch (retryError) {
          console.error(`Retry ${i + 1} failed:`, retryError.message);
          if (i < retries - 1) {
            const waitTime = delay * 2 ** i;
            console.log(`Waiting ${waitTime}ms before next retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }
      throw new Error("Failed to connect to MongoDB after multiple retries");
    };

    return retryConnection();
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error("Error during MongoDB shutdown:", err);
    process.exit(1);
  }
});

export default connectDB;
