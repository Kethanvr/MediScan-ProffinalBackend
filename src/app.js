import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fileUpload from "express-fileupload";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/chats", chatRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

export default app;
