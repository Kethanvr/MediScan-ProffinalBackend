import express from "express";
import {
  getHealthOverview,
  getMedicationAdherence,
  getVitalSignsTrends,
  updateMedicationRefill,
  addHealthRecord,
  getUpcomingAppointments,
  getVitalSigns,
  getMedications,
  getAppointments,
  getAllergies,
  updateMedication,
  updateAppointment,
  updateAllergy,
  deleteMedication,
  deleteAppointment,
  deleteAllergy,
} from "../controllers/healthController.js";
import { protect, healthAccess } from "../middlewares/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Health overview and statistics
router.get("/overview/:userId", healthAccess, asyncHandler(getHealthOverview));

// Medication management
router.get(
  "/medications/adherence/:userId",
  healthAccess,
  asyncHandler(getMedicationAdherence)
);
router.patch(
  "/medications/:userId/:medicationId/refill",
  healthAccess,
  asyncHandler(updateMedicationRefill)
);
router.get("/medications/:userId", healthAccess, asyncHandler(getMedications));
router.put(
  "/medications/:userId/:medicationId",
  healthAccess,
  asyncHandler(updateMedication)
);
router.delete(
  "/medications/:userId/:medicationId",
  healthAccess,
  asyncHandler(deleteMedication)
);

// Vital signs
router.get(
  "/vitals/:userId/trends",
  healthAccess,
  asyncHandler(getVitalSignsTrends)
);
router.get("/vitals/:userId", healthAccess, asyncHandler(getVitalSigns));

// Appointments
router.get(
  "/appointments/:userId/upcoming",
  healthAccess,
  asyncHandler(getUpcomingAppointments)
);
router.get(
  "/appointments/:userId",
  healthAccess,
  asyncHandler(getAppointments)
);
router.put(
  "/appointments/:userId/:appointmentId",
  healthAccess,
  asyncHandler(updateAppointment)
);
router.delete(
  "/appointments/:userId/:appointmentId",
  healthAccess,
  asyncHandler(deleteAppointment)
);

// Allergies
router.get("/allergies/:userId", healthAccess, asyncHandler(getAllergies));
router.put(
  "/allergies/:userId/:allergyId",
  healthAccess,
  asyncHandler(updateAllergy)
);
router.delete(
  "/allergies/:userId/:allergyId",
  healthAccess,
  asyncHandler(deleteAllergy)
);

// Generic health record operations
router.post("/records/:userId", healthAccess, asyncHandler(addHealthRecord));

export default router;
