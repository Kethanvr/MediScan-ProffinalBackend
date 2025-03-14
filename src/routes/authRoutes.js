import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken,
  logout,
} from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Protected routes
router.use(protect);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

export default router;
