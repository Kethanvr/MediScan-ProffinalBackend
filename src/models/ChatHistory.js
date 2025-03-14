import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Chat Session Info
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    title: String,
    type: {
      type: String,
      enum: [
        "general",
        "medication",
        "scan",
        "health_recommendation",
        "drug_interaction",
      ],
      default: "general",
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },

    // Messages
    messages: [
      {
        sender: {
          type: String,
          enum: ["user", "ai", "system"],
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
        type: {
          type: String,
          enum: ["text", "image", "scan", "recommendation", "error", "action"],
          default: "text",
        },
        metadata: {
          role: String,
          confidence: Number,
          processingTime: Number,
          aiModel: String,
          tokens: {
            prompt: Number,
            completion: Number,
            total: Number,
          },
        },
        attachments: [
          {
            type: {
              type: String,
              enum: ["image", "document", "scan", "report"],
            },
            url: String,
            filename: String,
            mimeType: String,
            size: Number,
          },
        ],
        reactions: [
          {
            type: String,
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            timestamp: Date,
          },
        ],
      },
    ],

    // Context and References
    context: {
      scanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scan",
      },
      medicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medication",
      },
      recommendationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HealthRecommendation",
      },
      previousSessionId: String,
      userPreferences: {
        language: String,
        units: String,
        timezone: String,
      },
    },

    // Analysis and Insights
    analysis: {
      topics: [
        {
          name: String,
          confidence: Number,
          mentions: Number,
        },
      ],
      sentiment: {
        score: Number,
        label: String,
      },
      intents: [
        {
          name: String,
          confidence: Number,
        },
      ],
      entities: [
        {
          type: String,
          value: String,
          confidence: Number,
        },
      ],
      summary: String,
    },

    // Actions and Outcomes
    actions: [
      {
        type: {
          type: String,
          enum: [
            "medication_reminder",
            "scan_request",
            "recommendation",
            "referral",
            "follow_up",
          ],
        },
        status: {
          type: String,
          enum: ["pending", "completed", "cancelled"],
          default: "pending",
        },
        description: String,
        dueDate: Date,
        completedDate: Date,
        result: String,
      },
    ],

    // Feedback
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      helpful: Boolean,
      comments: String,
      categories: [
        {
          name: String,
          rating: Number,
        },
      ],
      improvements: [String],
    },

    // Privacy and Security
    privacy: {
      level: {
        type: String,
        enum: ["public", "private", "shared"],
        default: "private",
      },
      sharedWith: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          permission: {
            type: String,
            enum: ["read", "write", "admin"],
          },
          sharedDate: Date,
        },
      ],
      retentionPeriod: Number, // in days
      dataUsageConsent: Boolean,
    },

    // Metadata
    metadata: {
      platform: String,
      device: String,
      browser: String,
      ip: String,
      location: {
        country: String,
        region: String,
        city: String,
      },
      tags: [String],
      version: String,
      lastActivity: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chatHistorySchema.index({ userId: 1, sessionId: 1 });
chatHistorySchema.index({ userId: 1, status: 1 });
chatHistorySchema.index({ "messages.timestamp": 1 });
chatHistorySchema.index({ type: 1, status: 1 });

// Middleware
chatHistorySchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.metadata.lastActivity = new Date();

    // Update analysis if needed
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.type === "text") {
        // Here you could integrate with NLP service to update analysis
        // For now, we'll just update the summary
        this.analysis.summary = `Chat session with ${this.messages.length} messages`;
      }
    }
  }
  next();
});

// Virtual fields
chatHistorySchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

chatHistorySchema.virtual("duration").get(function () {
  if (this.messages.length < 2) return 0;
  const first = this.messages[0].timestamp;
  const last = this.messages[this.messages.length - 1].timestamp;
  return (last - first) / 1000; // duration in seconds
});

// Methods
chatHistorySchema.methods.addMessage = async function (
  sender,
  content,
  type = "text",
  metadata = {}
) {
  this.messages.push({
    sender,
    content,
    type,
    metadata,
    timestamp: new Date(),
  });
  await this.save();
  return this.messages[this.messages.length - 1];
};

chatHistorySchema.methods.addAction = async function (
  actionType,
  description,
  dueDate = null
) {
  const action = {
    type: actionType,
    description,
    dueDate,
    status: "pending",
  };
  this.actions.push(action);
  await this.save();
  return action;
};

chatHistorySchema.methods.updatePrivacy = async function (
  level,
  retentionPeriod = null
) {
  this.privacy.level = level;
  if (retentionPeriod) {
    this.privacy.retentionPeriod = retentionPeriod;
  }
  await this.save();
  return this.privacy;
};

// Static methods
chatHistorySchema.statics.findRecentByUser = async function (
  userId,
  limit = 10
) {
  return await this.find({ userId })
    .sort({ "metadata.lastActivity": -1 })
    .limit(limit);
};

chatHistorySchema.statics.findByContext = async function (
  contextType,
  contextId
) {
  const query = {};
  query[`context.${contextType}Id`] = contextId;
  return await this.find(query).sort({ "metadata.lastActivity": -1 });
};

const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory;
