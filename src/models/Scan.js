import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic Scan Info
    scanType: {
      type: String,
      enum: ["medicine", "prescription", "label"],
      required: true,
    },
    scanDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    // Medicine Information
    medicineInfo: {
      name: { type: String, required: true },
      brand: String,
      manufacturer: String,
      dosageForm: String,
      strength: String,
      batchNumber: String,
      manufactureDate: Date,
      expiryDate: Date,
      barcode: String,
    },

    // Ingredients & Composition
    ingredients: {
      active: [
        {
          name: String,
          amount: String,
          unit: String,
        },
      ],
      inactive: [String],
      allergens: [String],
    },

    // Usage Information
    usageInfo: {
      indications: [String],
      dosage: String,
      administration: String,
      duration: String,
      frequency: String,
      warnings: [String],
      contraindications: [String],
      sideEffects: [String],
    },

    // Storage & Safety
    storage: {
      conditions: String,
      temperature: String,
      specialInstructions: [String],
    },

    // Images
    images: {
      original: {
        url: String,
        publicId: String,
      },
      processed: {
        url: String,
        publicId: String,
      },
    },

    // Analysis Results
    analysis: {
      confidence: Number,
      textDetection: {
        raw: String,
        processed: mongoose.Schema.Types.Mixed,
      },
      aiAnalysis: mongoose.Schema.Types.Mixed,
      warnings: [String],
    },

    // Interaction Checks
    interactions: [
      {
        medicine: String,
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe"],
        },
        description: String,
      },
    ],

    // Additional Information
    pricing: {
      price: Number,
      currency: String,
      pricePerUnit: Number,
      unit: String,
    },
    category: [String],
    tags: [String],
    notes: String,

    // Metadata
    metadata: {
      deviceInfo: mongoose.Schema.Types.Mixed,
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
      source: String,
      version: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ "medicineInfo.name": "text" });
scanSchema.index({ "metadata.location": "2dsphere" });

// Virtual for associated chats
scanSchema.virtual("chats", {
  ref: "Chat",
  localField: "_id",
  foreignField: "scanId",
});

// Methods
scanSchema.methods.generateReport = function () {
  // Method to generate a detailed report from scan data
  return {
    medicineName: this.medicineInfo.name,
    keyFindings: {
      warnings: this.usageInfo.warnings,
      interactions: this.interactions,
      expiryStatus:
        this.medicineInfo.expiryDate > new Date() ? "valid" : "expired",
    },
    recommendations: this.analysis.aiAnalysis?.recommendations || [],
  };
};

const Scan = mongoose.model("Scan", scanSchema);

export default Scan;
