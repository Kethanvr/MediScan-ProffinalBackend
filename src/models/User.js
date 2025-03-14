import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Authentication fields
    clerkId: { type: String, unique: true, sparse: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.clerkId;
      },
    },

    // Personal Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    phoneNumber: { type: String, trim: true },

    // Profile
    avatar: {
      url: { type: String },
      publicId: { type: String },
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // Health Information
    healthProfile: {
      bloodType: { type: String },
      allergies: [String],
      chronicConditions: [String],
      currentMedications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          startDate: Date,
          endDate: Date,
          refillReminder: Boolean,
          reminderFrequency: String,
        },
      ],
      emergencyContacts: [
        {
          name: String,
          relationship: String,
          phoneNumber: String,
        },
      ],
    },

    // Medication Management
    medicationSchedule: [
      {
        medicationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Medication",
        },
        timeSlots: [String],
        daysOfWeek: [String],
        reminders: Boolean,
        lastTaken: Date,
        nextDue: Date,
        adherenceRate: Number,
      },
    ],

    // Health Records
    healthRecords: [
      {
        type: {
          type: String,
          enum: ["report", "prescription", "scan", "other"],
        },
        title: String,
        date: Date,
        fileUrl: String,
        provider: String,
        notes: String,
      },
    ],

    // Payment Information
    paymentMethods: [
      {
        type: { type: String, enum: ["card", "bank"] },
        lastFour: String,
        isDefault: Boolean,
        expiryDate: Date,
      },
    ],

    // Settings & Preferences
    settings: {
      language: { type: String, default: "en" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      theme: { type: String, default: "light" },
      timezone: String,
    },

    // Account Status
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ clerkId: 1 });
userSchema.index({ "healthProfile.currentMedications.name": 1 });

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 3600000; // Lock for 1 hour
  }
  await this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
