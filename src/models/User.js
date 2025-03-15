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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Personal Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },

    // Profile
    avatar: {
      url: { type: String },
      publicId: { type: String },
    },
    profile: {
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      bloodGroup: String,
      height: Number, // in cm
      weight: Number, // in kg
      allergies: [String],
      chronicConditions: [String],
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
      },
    },

    // Health Records
    scans: [
      {
        title: String,
        description: String,
        fileUrl: String,
        publicId: String,
        uploadDate: { type: Date, default: Date.now },
        tags: [String],
        type: {
          type: String,
          enum: ["xray", "mri", "ct", "ultrasound", "other"],
        },
        status: {
          type: String,
          enum: ["pending", "reviewed", "diagnosed"],
          default: "pending",
        },
        notes: String,
        diagnosis: {
          condition: String,
          details: String,
          date: Date,
          doctor: String,
        },
      },
    ],

    // Chat History
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],

    // Settings & Preferences
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      language: { type: String, default: "en" },
      theme: { type: String, default: "light" },
      timezone: String,
      scanPreferences: {
        defaultView: { type: String, default: "grid" },
        sortBy: { type: String, default: "date" },
        filterDefaults: {
          type: [String],
          default: ["all"],
        },
      },
    },

    // Account Status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        const { password, __v, loginAttempts, lockUntil, ...rest } = ret;
        return rest;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual fields
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "scans.uploadDate": -1 });
userSchema.index({ "scans.type": 1 });
userSchema.index({ "scans.status": 1 });

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

userSchema.methods.getProfile = function () {
  const profile = {
    _id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    phone: this.phone,
    avatar: this.avatar,
    profile: this.profile,
    preferences: this.preferences,
    role: this.role,
    status: this.status,
    verification: this.verification,
    scans: this.scans?.length || 0,
    chats: this.chats?.length || 0,
  };
  return profile;
};

const User = mongoose.model("User", userSchema);

export default User;
