import mongoose from "mongoose";

const healthRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic Recommendation Info
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "medication",
        "lifestyle",
        "diet",
        "exercise",
        "mental_health",
        "preventive_care",
        "chronic_condition",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["active", "completed", "dismissed", "expired"],
      default: "active",
    },

    // Detailed Recommendation Content
    description: {
      type: String,
      required: true,
    },
    rationale: String,
    goals: [
      {
        description: String,
        timeframe: String,
        metrics: [
          {
            name: String,
            target: String,
            unit: String,
          },
        ],
      },
    ],

    // Action Items
    actionItems: [
      {
        title: String,
        description: String,
        frequency: {
          type: String,
          enum: ["once", "daily", "weekly", "monthly", "as_needed"],
        },
        duration: String,
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "skipped"],
          default: "pending",
        },
        completedDate: Date,
      },
    ],

    // Timeline
    timeline: {
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: Date,
      checkpoints: [
        {
          date: Date,
          title: String,
          description: String,
          status: {
            type: String,
            enum: ["upcoming", "completed", "missed"],
            default: "upcoming",
          },
        },
      ],
    },

    // Related Information
    relatedConditions: [
      {
        condition: String,
        relevance: String,
      },
    ],
    relatedMedications: [
      {
        medicationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Medication",
        },
        relevance: String,
      },
    ],
    contraindications: [
      {
        description: String,
        severity: {
          type: String,
          enum: ["low", "medium", "high"],
        },
      },
    ],

    // Progress Tracking
    progressTracking: {
      metrics: [
        {
          name: String,
          unit: String,
          target: Number,
          current: Number,
          history: [
            {
              value: Number,
              date: {
                type: Date,
                default: Date.now,
              },
              note: String,
            },
          ],
        },
      ],
      adherence: {
        rate: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        lastChecked: Date,
      },
    },

    // Reminders
    reminders: {
      enabled: {
        type: Boolean,
        default: true,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "custom"],
      },
      customSchedule: [
        {
          dayOfWeek: Number,
          time: String,
        },
      ],
      lastSent: Date,
      nextReminder: Date,
    },

    // Feedback
    feedback: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        challenges: [String],
        improvements: [String],
      },
    ],

    // Source and Evidence
    source: {
      type: {
        type: String,
        enum: ["ai_generated", "healthcare_provider", "system", "manual"],
        required: true,
      },
      provider: String,
      evidenceLevel: {
        type: String,
        enum: [
          "expert_opinion",
          "case_studies",
          "clinical_trials",
          "systematic_review",
        ],
      },
      references: [
        {
          title: String,
          url: String,
          type: String,
        },
      ],
    },

    // Metadata
    metadata: {
      createdBy: String,
      lastModified: {
        type: Date,
        default: Date.now,
      },
      version: String,
      tags: [String],
      aiModel: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1,
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
healthRecommendationSchema.index({ userId: 1, category: 1 });
healthRecommendationSchema.index({ userId: 1, status: 1 });
healthRecommendationSchema.index({
  "timeline.startDate": 1,
  "timeline.endDate": 1,
});

// Middleware
healthRecommendationSchema.pre("save", function (next) {
  // Update adherence rate
  if (this.progressTracking && this.progressTracking.metrics.length > 0) {
    const metrics = this.progressTracking.metrics;
    let totalProgress = 0;

    metrics.forEach((metric) => {
      if (metric.target && metric.current) {
        const progress = (metric.current / metric.target) * 100;
        totalProgress += Math.min(progress, 100);
      }
    });

    this.progressTracking.adherence.rate = totalProgress / metrics.length;
    this.progressTracking.adherence.lastChecked = new Date();
  }
  next();
});

// Virtual fields
healthRecommendationSchema.virtual("isExpired").get(function () {
  if (!this.timeline.endDate) return false;
  return new Date() > this.timeline.endDate;
});

healthRecommendationSchema.virtual("daysRemaining").get(function () {
  if (!this.timeline.endDate) return null;
  const now = new Date();
  const end = new Date(this.timeline.endDate);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
});

// Methods
healthRecommendationSchema.methods.updateProgress = async function (
  metricName,
  value,
  note = ""
) {
  const metric = this.progressTracking.metrics.find(
    (m) => m.name === metricName
  );
  if (metric) {
    metric.current = value;
    metric.history.push({
      value,
      date: new Date(),
      note,
    });
    await this.save();
    return metric;
  }
  return null;
};

healthRecommendationSchema.methods.addFeedback = async function (
  rating,
  comment = "",
  challenges = [],
  improvements = []
) {
  this.feedback.push({
    date: new Date(),
    rating,
    comment,
    challenges,
    improvements,
  });
  await this.save();
  return this.feedback[this.feedback.length - 1];
};

// Static methods
healthRecommendationSchema.statics.findActiveByUser = async function (userId) {
  return await this.find({
    userId,
    status: "active",
    $or: [
      { "timeline.endDate": { $gt: new Date() } },
      { "timeline.endDate": null },
    ],
  }).sort({ priority: -1 });
};

const HealthRecommendation = mongoose.model(
  "HealthRecommendation",
  healthRecommendationSchema
);

export default HealthRecommendation;
