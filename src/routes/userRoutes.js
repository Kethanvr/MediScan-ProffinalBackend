import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
} from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router; 