import HealthRecord from "../models/HealthRecord.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";

// Get health overview with aggregated stats
export const getHealthOverview = async (req, res) => {
  const { userId } = req.params;

  const overview = await HealthRecord.aggregate([
    { $match: { userId: userId } },
    {
      $facet: {
        medicationStats: [
          { $unwind: "$medications" },
          { $match: { "medications.status": "Active" } },
          { $count: "activeCount" },
        ],
        appointmentStats: [
          { $unwind: "$appointments" },
          {
            $match: {
              "appointments.status": "Scheduled",
              "appointments.date": { $gte: new Date() },
            },
          },
          { $count: "upcomingCount" },
        ],
        conditionStats: [
          { $unwind: "$conditions" },
          { $match: { "conditions.status": "Active" } },
          { $count: "activeCount" },
        ],
        recentVitals: [
          { $unwind: "$vitalSigns" },
          { $sort: { "vitalSigns.timestamp": -1 } },
          { $limit: 5 },
          {
            $group: {
              _id: "$vitalSigns.type",
              lastReading: { $first: "$vitalSigns" },
            },
          },
        ],
      },
    },
  ]);

  return res.json(
    new ApiResponse(200, overview[0], "Health overview retrieved successfully")
  );
};

// Get medication adherence analytics
export const getMedicationAdherence = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  const adherenceStats = await HealthRecord.aggregate([
    { $match: { userId: userId } },
    { $unwind: "$medications" },
    { $unwind: "$medications.adherence" },
    {
      $match: {
        "medications.status": "Active",
        "medications.adherence.date": {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: "$medications.name",
        totalDoses: { $sum: 1 },
        takenDoses: {
          $sum: { $cond: ["$medications.adherence.taken", 1, 0] },
        },
        adherenceRate: {
          $avg: { $cond: ["$medications.adherence.taken", 1, 0] },
        },
      },
    },
    {
      $project: {
        medication: "$_id",
        totalDoses: 1,
        takenDoses: 1,
        adherenceRate: { $multiply: ["$adherenceRate", 100] },
      },
    },
  ]);

  return res.json(
    new ApiResponse(
      200,
      adherenceStats,
      "Medication adherence stats retrieved successfully"
    )
  );
};

// Get vital signs trends
export const getVitalSignsTrends = async (req, res) => {
  const { userId } = req.params;
  const { type, period } = req.query;

  if (!type || !period) {
    throw new ApiError(400, "Vital sign type and period are required");
  }

  const trends = await HealthRecord.aggregate([
    { $match: { userId: userId } },
    { $unwind: "$vitalSigns" },
    {
      $match: {
        "vitalSigns.type": type,
        "vitalSigns.timestamp": {
          $gte: new Date(new Date().getTime() - period * 24 * 60 * 60 * 1000),
        },
      },
    },
    { $sort: { "vitalSigns.timestamp": 1 } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$vitalSigns.timestamp",
          },
        },
        readings: {
          $push: {
            value: "$vitalSigns.value",
            timestamp: "$vitalSigns.timestamp",
            notes: "$vitalSigns.notes",
          },
        },
        avgValue: { $avg: "$vitalSigns.value" },
      },
    },
  ]);

  return res.json(
    new ApiResponse(200, trends, "Vital signs trends retrieved successfully")
  );
};

// Update medication refill status
export const updateMedicationRefill = async (req, res) => {
  const { userId, medicationId } = req.params;
  const { remaining, nextRefillDate } = req.body;

  if (!remaining || !nextRefillDate) {
    throw new ApiError(
      400,
      "Remaining refills and next refill date are required"
    );
  }

  const result = await HealthRecord.findOneAndUpdate(
    {
      userId: userId,
      "medications._id": medicationId,
    },
    {
      $set: {
        "medications.$.refills.remaining": remaining,
        "medications.$.refills.lastRefillDate": new Date(),
        "medications.$.refills.nextRefillDate": nextRefillDate,
      },
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or medication not found");
  }

  return res.json(
    new ApiResponse(200, result, "Medication refill updated successfully")
  );
};

// Add health record entry
export const addHealthRecord = async (req, res) => {
  const { userId } = req.params;
  const { type, data } = req.body;

  if (!type || !data) {
    throw new ApiError(400, "Record type and data are required");
  }

  let updateQuery = {};
  switch (type) {
    case "vitalSigns":
    case "medications":
    case "appointments":
    case "conditions":
    case "allergies":
      updateQuery = { $push: { [type]: data } };
      break;
    default:
      throw new ApiError(400, "Invalid record type");
  }

  const result = await HealthRecord.findOneAndUpdate(
    { userId: userId },
    updateQuery,
    { new: true, upsert: true }
  );

  return res.json(
    new ApiResponse(201, result, "Health record added successfully")
  );
};

// Get upcoming appointments
export const getUpcomingAppointments = async (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const appointments = await HealthRecord.aggregate([
    { $match: { userId: userId } },
    { $unwind: "$appointments" },
    {
      $match: {
        "appointments.status": "Scheduled",
        "appointments.date": {
          $gte: new Date(),
          $lte: new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000),
        },
      },
    },
    { $sort: { "appointments.date": 1 } },
    {
      $group: {
        _id: null,
        appointments: {
          $push: {
            _id: "$appointments._id",
            type: "$appointments.type",
            provider: "$appointments.provider",
            date: "$appointments.date",
            location: "$appointments.location",
            notes: "$appointments.notes",
          },
        },
      },
    },
  ]);

  return res.json(
    new ApiResponse(
      200,
      appointments.length ? appointments[0].appointments : [],
      "Upcoming appointments retrieved successfully"
    )
  );
};

// Get vital signs
export const getVitalSigns = async (req, res) => {
  const { userId } = req.params;

  const healthRecord = await HealthRecord.findOne({ userId });

  if (!healthRecord) {
    return res.json(
      new ApiResponse(200, [], "No vital signs found for this user")
    );
  }

  return res.json(
    new ApiResponse(
      200,
      healthRecord.vitalSigns || [],
      "Vital signs retrieved successfully"
    )
  );
};

// Get medications
export const getMedications = async (req, res) => {
  const { userId } = req.params;

  const healthRecord = await HealthRecord.findOne({ userId });

  if (!healthRecord) {
    return res.json(
      new ApiResponse(200, [], "No medications found for this user")
    );
  }

  return res.json(
    new ApiResponse(
      200,
      healthRecord.medications || [],
      "Medications retrieved successfully"
    )
  );
};

// Update medication
export const updateMedication = async (req, res) => {
  const { userId, medicationId } = req.params;
  const updateData = req.body;

  const result = await HealthRecord.findOneAndUpdate(
    {
      userId: userId,
      "medications._id": medicationId,
    },
    {
      $set: Object.entries(updateData).reduce((acc, [key, value]) => {
        acc[`medications.$.${key}`] = value;
        return acc;
      }, {}),
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or medication not found");
  }

  return res.json(
    new ApiResponse(200, result, "Medication updated successfully")
  );
};

// Delete medication
export const deleteMedication = async (req, res) => {
  const { userId, medicationId } = req.params;

  const result = await HealthRecord.findOneAndUpdate(
    { userId: userId },
    { $pull: { medications: { _id: medicationId } } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or medication not found");
  }

  return res.json(
    new ApiResponse(200, result, "Medication deleted successfully")
  );
};

// Get appointments
export const getAppointments = async (req, res) => {
  const { userId } = req.params;

  const healthRecord = await HealthRecord.findOne({ userId });

  if (!healthRecord) {
    return res.json(
      new ApiResponse(200, [], "No appointments found for this user")
    );
  }

  return res.json(
    new ApiResponse(
      200,
      healthRecord.appointments || [],
      "Appointments retrieved successfully"
    )
  );
};

// Update appointment
export const updateAppointment = async (req, res) => {
  const { userId, appointmentId } = req.params;
  const updateData = req.body;

  const result = await HealthRecord.findOneAndUpdate(
    {
      userId: userId,
      "appointments._id": appointmentId,
    },
    {
      $set: Object.entries(updateData).reduce((acc, [key, value]) => {
        acc[`appointments.$.${key}`] = value;
        return acc;
      }, {}),
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or appointment not found");
  }

  return res.json(
    new ApiResponse(200, result, "Appointment updated successfully")
  );
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  const { userId, appointmentId } = req.params;

  const result = await HealthRecord.findOneAndUpdate(
    { userId: userId },
    { $pull: { appointments: { _id: appointmentId } } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or appointment not found");
  }

  return res.json(
    new ApiResponse(200, result, "Appointment deleted successfully")
  );
};

// Get allergies
export const getAllergies = async (req, res) => {
  const { userId } = req.params;

  const healthRecord = await HealthRecord.findOne({ userId });

  if (!healthRecord) {
    return res.json(
      new ApiResponse(200, [], "No allergies found for this user")
    );
  }

  return res.json(
    new ApiResponse(
      200,
      healthRecord.allergies || [],
      "Allergies retrieved successfully"
    )
  );
};

// Update allergy
export const updateAllergy = async (req, res) => {
  const { userId, allergyId } = req.params;
  const updateData = req.body;

  const result = await HealthRecord.findOneAndUpdate(
    {
      userId: userId,
      "allergies._id": allergyId,
    },
    {
      $set: Object.entries(updateData).reduce((acc, [key, value]) => {
        acc[`allergies.$.${key}`] = value;
        return acc;
      }, {}),
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or allergy not found");
  }

  return res.json(new ApiResponse(200, result, "Allergy updated successfully"));
};

// Delete allergy
export const deleteAllergy = async (req, res) => {
  const { userId, allergyId } = req.params;

  const result = await HealthRecord.findOneAndUpdate(
    { userId: userId },
    { $pull: { allergies: { _id: allergyId } } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(404, "Health record or allergy not found");
  }

  return res.json(new ApiResponse(200, result, "Allergy deleted successfully"));
};
