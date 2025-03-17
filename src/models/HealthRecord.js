import mongoose from "mongoose";

const vitalSignSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'blood_pressure', 'heart_rate', 'temperature'
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  unit: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: String,
});

const allergySchema = new mongoose.Schema({
  name: { type: String, required: true },
  severity: {
    type: String,
    enum: ["Mild", "Moderate", "Severe"],
    required: true,
  },
  diagnosed: { type: Date },
  symptoms: [String],
  notes: String,
});

const conditionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["Active", "Inactive", "In Remission"],
    required: true,
  },
  diagnosed: { type: Date },
  treatments: [String],
  notes: String,
});

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  prescribedBy: String,
  purpose: String,
  status: {
    type: String,
    enum: ["Active", "Discontinued", "Completed"],
    default: "Active",
  },
  refills: {
    remaining: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    lastRefillDate: Date,
    nextRefillDate: Date,
  },
  adherence: [
    {
      date: { type: Date },
      taken: { type: Boolean, default: false },
      timestamp: { type: Date },
      notes: String,
    },
  ],
});

const appointmentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  provider: { type: String, required: true },
  date: { type: Date, required: true },
  location: String,
  status: {
    type: String,
    enum: ["Scheduled", "Completed", "Cancelled", "Missed"],
    default: "Scheduled",
  },
  notes: String,
  followUp: Date,
});

const healthRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vitalSigns: [vitalSignSchema],
    allergies: [allergySchema],
    conditions: [conditionSchema],
    medications: [medicationSchema],
    appointments: [appointmentSchema],
    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
        email: String,
      },
    ],
    bloodType: String,
    organDonor: Boolean,
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient querying
healthRecordSchema.index({ userId: 1 });
healthRecordSchema.index({ "medications.status": 1 });
healthRecordSchema.index({ "appointments.date": 1 });

// Virtual for upcoming appointments
healthRecordSchema.virtual("upcomingAppointments").get(function () {
  const now = new Date();
  return this.appointments
    .filter((apt) => apt.date > now && apt.status === "Scheduled")
    .sort((a, b) => a.date - b.date);
});

// Method to check medication adherence
healthRecordSchema.methods.getMedicationAdherence = function (
  medicationId,
  startDate,
  endDate
) {
  const medication = this.medications.id(medicationId);
  if (!medication) return null;

  const adherenceRecords = medication.adherence.filter(
    (record) => record.date >= startDate && record.date <= endDate
  );

  const total = adherenceRecords.length;
  const taken = adherenceRecords.filter((record) => record.taken).length;

  return {
    total,
    taken,
    adherenceRate: total > 0 ? (taken / total) * 100 : 0,
  };
};

const HealthRecord = mongoose.model("HealthRecord", healthRecordSchema);
export default HealthRecord;
