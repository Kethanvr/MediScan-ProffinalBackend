import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "../utils/tokens.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";

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
  if (req.user?.role !== "admin") {
    throw new ApiError(403, "Not authorized as admin");
  }
  next();
};
