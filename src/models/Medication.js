import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic Medication Info
    name: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["prescription", "otc", "supplement"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "discontinued"],
      default: "active",
    },

    // Dosage Information
    dosage: {
      amount: Number,
      unit: String,
      form: {
        type: String,
        enum: ["tablet", "capsule", "liquid", "injection", "other"],
      },
      frequency: {
        times: Number,
        period: {
          type: String,
          enum: ["daily", "weekly", "monthly"],
        },
      },
      timing: [
        {
          time: String,
          daysOfWeek: [Number], // 0-6 for Sunday-Saturday
        },
      ],
    },

    // Schedule
    schedule: {
      startDate: Date,
      endDate: Date,
      duration: Number, // in days
      refillDate: Date,
      lastTaken: Date,
      nextDose: Date,
    },

    // Reminders
    reminders: {
      enabled: {
        type: Boolean,
        default: true,
      },
      type: [
        {
          type: String,
          enum: ["push", "email", "sms"],
        },
      ],
      reminderTime: [String], // Array of times in HH:mm format
      notifyBeforeRefill: {
        type: Number,
        default: 7, // days
      },
    },

    // Adherence Tracking
    adherence: {
      taken: [
        {
          date: Date,
          time: String,
          status: {
            type: String,
            enum: ["taken", "missed", "skipped"],
          },
          note: String,
        },
      ],
      rate: {
        type: Number,
        default: 0,
      },
      streak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
      },
    },

    // Prescription Details
    prescription: {
      prescribedBy: String,
      prescriptionDate: Date,
      prescriptionId: String,
      pharmacy: String,
      insurance: {
        provider: String,
        policyNumber: String,
        coverage: String,
      },
    },

    // Inventory Management
    inventory: {
      current: Number,
      unit: String,
      minimum: Number,
      refillAmount: Number,
      refillHistory: [
        {
          date: Date,
          amount: Number,
          source: String,
        },
      ],
    },

    // Side Effects & Notes
    sideEffects: [
      {
        effect: String,
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe"],
        },
        date: Date,
        notes: String,
      },
    ],
    notes: [
      {
        content: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Metadata
    metadata: {
      source: {
        type: String,
        enum: ["manual", "scan", "prescription", "import"],
      },
      lastUpdated: Date,
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
medicationSchema.index({ userId: 1, status: 1 });
medicationSchema.index({ name: "text" });
medicationSchema.index({ "schedule.nextDose": 1 });

// Middleware
medicationSchema.pre("save", function (next) {
  // Update adherence rate
  if (this.isModified("adherence.taken")) {
    const taken = this.adherence.taken.filter(
      (t) => t.status === "taken"
    ).length;
    const total = this.adherence.taken.length;
    this.adherence.rate = total > 0 ? (taken / total) * 100 : 0;
  }
  next();
});

// Virtual fields
medicationSchema.virtual("daysRemaining").get(function () {
  if (!this.schedule.endDate) return null;
  const now = new Date();
  const end = new Date(this.schedule.endDate);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
});

// Methods
medicationSchema.methods.checkRefillNeeded = function () {
  return this.inventory.current <= this.inventory.minimum;
};

medicationSchema.methods.updateAdherence = async function (status, note = "") {
  const now = new Date();
  this.adherence.taken.push({
    date: now,
    time: now.toLocaleTimeString(),
    status,
    note,
  });

  // Update streak
  if (status === "taken") {
    this.adherence.streak.current++;
    if (this.adherence.streak.current > this.adherence.streak.longest) {
      this.adherence.streak.longest = this.adherence.streak.current;
    }
  } else {
    this.adherence.streak.current = 0;
  }

  await this.save();
  return this.adherence;
};

const Medication = mongoose.model("Medication", medicationSchema);

export default Medication;
