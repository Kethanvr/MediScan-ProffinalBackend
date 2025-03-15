import express from "express";
import {
  register,
  login,
  getProfile,
  getProfileWithData,
  updateProfile,
  updateAvatar,
  getUserStats,
  getMedicalHistory,
  updatePreferences,
} from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", protect, getProfile);
router.get("/profile/full", protect, getProfileWithData);
router.put("/profile", protect, updateProfile);
router.put("/profile/avatar", protect, upload.single("avatar"), updateAvatar);
router.get("/profile/stats", protect, getUserStats);
router.get("/profile/medical-history", protect, getMedicalHistory);
router.put("/profile/preferences", protect, updatePreferences);

export default router;
