import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import fileUpload from "express-fileupload";
import connectDB from "./db/mongodb.js";
import userRoutes from "./routes/userRoutes.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  })
);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Clerk protected routes
app.use("/api/clerk", ClerkExpressRequireAuth(), (req, res, next) => {
  req.user = req.auth;
  next();
});

// Clerk user route
app.get("/api/clerk/user", (req, res) => {
  res.json({
    id: req.auth.userId,
    email: req.auth.email,
    firstName: req.auth.firstName,
    lastName: req.auth.lastName,
  });
});

// Custom auth routes
app.use("/api/auth", userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
