import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import fileUpload from "express-fileupload";
import connectDB from "./db/mongodb.js";
import userRoutes from "./routes/userRoutes.js";
import app from "./app.js";

// Load environment variables
dotenv.config({
  path: "./.env",
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      console.log(`\n✅ Server is running on port: ${port}`);
      console.log(`\n✅ MongoDB Connected: `);
    });
  } catch (error) {
    console.error("ERROR: ", error);
    process.exit(1);
  }
};

startServer();
