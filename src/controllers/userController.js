import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import ApiError from "../utils/ApiError.js";
import ApiResponce from "../utils/ApiResponce.js";
import { uploadToCloudinary } from "../utils/cloudniary.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Set refresh token in HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(statusCode).json(
    new ApiResponce(statusCode, "Success", {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
    })
  );
};

// Register new user
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User already exists");
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    username: email.split("@")[0], // Default username from email
  });

  sendTokenResponse(user, 201, res);
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get user profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json(
    new ApiResponce(200, "Profile fetched successfully", user.getProfile())
  );
});

// Get user profile with related data
export const getProfileWithData = async (req, res, next) => {
  try {
    const userData = await User.findWithRelatedData(req.user._id);
    if (!userData || userData.length === 0) {
      throw new ApiError(404, "user not found");
    }
    res.json({ success: true, data: userData[0] });
  } catch (error) {
    throw new ApiError(500, "S M W");
  }
};

// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {
  // Validate request body
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Update data is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Extract fields from request body
  const {
    firstName,
    lastName,
    email,
    phone,
    location,
    health,
    emergencyContact,
  } = req.body;

  // Update basic fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;

  // Update email if changed and not already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, "Email already in use");
    }
    user.email = email;
  }

  // Update profile fields
  if (!user.profile) user.profile = {};

  if (location) {
    if (!user.profile.address) user.profile.address = {};
    user.profile.address.city = location;
  }

  // Update health information
  if (health) {
    if (health.bloodType) user.profile.bloodGroup = health.bloodType;
    if (health.height) user.profile.height = health.height;
    if (health.weight) user.profile.weight = health.weight;
    if (health.allergies) user.profile.allergies = health.allergies;
    if (health.medications) user.profile.chronicConditions = health.medications;
  }

  // Update emergency contact
  if (emergencyContact) {
    user.profile.emergencyContact = {
      name: emergencyContact.name,
      relationship: emergencyContact.relationship,
      phone: emergencyContact.phone,
    };
  }

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponce(200, user.getProfile(), "Profile updated successfully")
    );
});

// Update user avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old avatar if exists
  if (user.avatar?.publicId) {
    await uploadToCloudinary.deleteFromCloudinary(user.avatar.publicId);
  }

  // Upload to cloudinary
  const result = await uploadToCloudinary(req.file.path, {
    folder: "avatars",
    public_id: `avatar_${user._id}`,
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto" },
    ],
  });

  user.avatar = {
    url: result.secure_url,
    publicId: result.public_id,
  };
  await user.save();

  res.json(
    new ApiResponce(200, "Avatar updated successfully", { avatar: user.avatar })
  );
});

// Get user stats
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $lookup: {
        from: "scans",
        localField: "scans._id",
        foreignField: "_id",
        as: "scanDetails",
      },
    },
    {
      $project: {
        totalScans: { $size: "$scans" },
        pendingScans: {
          $size: {
            $filter: {
              input: "$scans",
              as: "scan",
              cond: { $eq: ["$$scan.status", "pending"] },
            },
          },
        },
        reviewedScans: {
          $size: {
            $filter: {
              input: "$scans",
              as: "scan",
              cond: { $eq: ["$$scan.status", "reviewed"] },
            },
          },
        },
        diagnosedScans: {
          $size: {
            $filter: {
              input: "$scans",
              as: "scan",
              cond: { $eq: ["$$scan.status", "diagnosed"] },
            },
          },
        },
        recentScans: {
          $slice: ["$scans", -5],
        },
      },
    },
  ]);

  res.json(new ApiResponce(200, "Stats fetched successfully", stats[0] || {}));
});

// Get user medical history
export const getMedicalHistory = async (req, res, next) => {
  try {
    const history = await User.aggregate([
      { $match: { _id: req.user._id } },
      {
        $lookup: {
          from: "medicalrecords",
          localField: "medical_history",
          foreignField: "_id",
          as: "medical_history",
        },
      },
      {
        $unwind: "$medical_history",
      },
      {
        $sort: { "medical_history.date": -1 },
      },
      {
        $group: {
          _id: "$_id",
          records: { $push: "$medical_history" },
        },
      },
    ]);

    res.json({ success: true, data: history[0]?.records || [] });
  } catch (error) {
    throw new ApiError(401, "Invalid credentials");
  }
};

// Update user preferences
export const updatePreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.preferences = {
    ...user.preferences,
    ...req.body,
  };

  await user.save();
  res.json(
    new ApiResponce(200, "Preferences updated successfully", user.preferences)
  );
});

// Refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token required");
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  sendTokenResponse(user, 200, res);
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json(new ApiResponce(200, "Logged out successfully"));
});
