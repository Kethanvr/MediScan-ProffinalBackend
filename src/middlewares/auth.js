import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "../utils/tokens.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

// Main authentication middleware
export const protect = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
      throw new ApiError(401, "Access token required");
    }

    // Verify access token
    const decodedAccess = verifyAccessToken(accessToken);
    if (decodedAccess) {
      const user = await User.findById(decodedAccess.id).select("-password");
      if (!user) {
        throw new ApiError(401, "User not found");
      }
      req.user = user;
      return next();
    }

    // If access token is invalid, check refresh token
    if (!refreshToken) {
      throw new ApiError(401, "Please login again");
    }

    const decodedRefresh = verifyRefreshToken(refreshToken);
    if (!decodedRefresh) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Get user and generate new access token
    const user = await User.findById(decodedRefresh.id).select("-password");
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    const newAccessToken = generateAccessToken(user._id);
    res.setHeader("Authorization", `Bearer ${newAccessToken}`);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Admin middleware
export const admin = (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      throw new ApiError(403, "Not authorized as admin");
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Health routes middleware with role-based access
export const healthAccess = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Authentication required");
    }

    // Allow access to own health records or if admin
    if (user.role === "admin" || user._id.toString() === req.params.userId) {
      return next();
    }

    throw new ApiError(403, "Not authorized to access these health records");
  } catch (error) {
    next(error);
  }
};

// Middleware to authenticate JWT tokens
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    // If using Clerk authentication
    if (process.env.USE_CLERK === "true") {
      return ClerkExpressRequireAuth()(req, res, next);
    }

    // For JWT authentication
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: "Authentication error" });
  }
};

// Middleware to verify admin role
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
};
