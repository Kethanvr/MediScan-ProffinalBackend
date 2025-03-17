import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    messages: [messageSchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ["general", "medication", "diagnosis", "symptoms", "other"],
      default: "general",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
chatSchema.index({ userId: 1 });
chatSchema.index({ updatedAt: -1 });

// Virtual for last message
chatSchema.virtual("lastMessage").get(function () {
  if (this.messages && this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
});

// Method to get chat summary
chatSchema.methods.getSummary = function () {
  return {
    _id: this._id,
    title: this.title,
    lastMessage: this.lastMessage,
    updatedAt: this.updatedAt,
    messageCount: this.messages.length,
  };
};

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
