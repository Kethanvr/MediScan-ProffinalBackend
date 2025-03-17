import express from "express";
import {
  getChats,
  getChat,
  createChat,
  sendMessage,
  deleteChat,
} from "../controllers/chatController.js";
import { protect } from "../middlewares/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Chat routes
router.get("/", asyncHandler(getChats));
router.post("/", asyncHandler(createChat));
router.get("/:chatId", asyncHandler(getChat));
router.post("/:chatId/messages", asyncHandler(sendMessage));
router.delete("/:chatId", asyncHandler(deleteChat));

export default router;
