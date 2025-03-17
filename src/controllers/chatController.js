import Chat from "../models/Chat.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";
import asyncHandler from "../utils/asyncHandler.js";

// Get all chats for a user
export const getChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({ userId })
    .sort({ updatedAt: -1 })
    .select("title messages.content messages.timestamp updatedAt");

  return res
    .status(200)
    .json(new ApiResponse(200, chats, "Chats retrieved successfully"));
});

// Get a specific chat by ID
export const getChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  const chat = await Chat.findOne({ _id: chatId, userId });

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Chat retrieved successfully"));
});

// Create a new chat
export const createChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { title } = req.body;

  const newChat = await Chat.create({
    userId,
    title: title || "New Chat",
    messages: [
      {
        role: "assistant",
        content:
          "Hello! I'm your MediScan AI assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ],
  });

  // Add chat reference to user
  await User.findByIdAndUpdate(userId, {
    $push: { chats: newChat._id },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newChat, "Chat created successfully"));
});

// Add a message to a chat
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;
  const { message } = req.body;

  if (!message) {
    throw new ApiError(400, "Message content is required");
  }

  const chat = await Chat.findOne({ _id: chatId, userId });

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // Add user message
  chat.messages.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  // Simulate AI response (in a real app, you would call an AI service here)
  chat.messages.push({
    role: "assistant",
    content:
      "I understand your question about medical concerns. Let me help you with that. [This is a simulated response]",
    timestamp: new Date(),
  });

  await chat.save();

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Message sent successfully"));
});

// Delete a chat
export const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  const chat = await Chat.findOneAndDelete({ _id: chatId, userId });

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // Remove chat reference from user
  await User.findByIdAndUpdate(userId, {
    $pull: { chats: chatId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Chat deleted successfully"));
});
