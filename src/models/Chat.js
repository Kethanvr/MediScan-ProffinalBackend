import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "document", "scan"],
        },
        url: String,
        publicId: String,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    metadata: {
      scanReference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scan",
      },
      medicineReference: String,
      context: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    type: {
      type: String,
      enum: ["general", "scan-analysis", "medication-query", "health-advice"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
    messages: [messageSchema],
    context: {
      scanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scan",
      },
      medicationInfo: mongoose.Schema.Types.Mixed,
      userPreferences: mongoose.Schema.Types.Mixed,
      previousInteractions: [String],
    },
    metadata: {
      lastMessageAt: Date,
      messageCount: {
        type: Number,
        default: 0,
      },
      aiModel: String,
      language: {
        type: String,
        default: "en",
      },
      tags: [String],
    },
    settings: {
      notifications: {
        type: Boolean,
        default: true,
      },
      retention: {
        type: Number, // Days to keep chat history
        default: 30,
      },
      privacy: {
        type: String,
        enum: ["private", "shared"],
        default: "private",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ "context.scanId": 1 });
chatSchema.index({ title: "text" });

// Middleware
chatSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.metadata.lastMessageAt = new Date();
    this.metadata.messageCount = this.messages.length;
  }
  next();
});

// Virtual fields
chatSchema.virtual("lastMessage").get(function () {
  const messages = this.messages;
  return messages.length > 0 ? messages[messages.length - 1] : null;
});

// Methods
chatSchema.methods.addMessage = async function (messageData) {
  this.messages.push(messageData);
  await this.save();
  return this.messages[this.messages.length - 1];
};

chatSchema.methods.summarize = function () {
  return {
    title: this.title,
    messageCount: this.metadata.messageCount,
    lastMessageAt: this.metadata.lastMessageAt,
    type: this.type,
    preview:
      this.messages.length > 0
        ? this.messages[this.messages.length - 1].content.substring(0, 100)
        : "",
  };
};

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
