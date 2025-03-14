import mongoose from "mongoose";

const drugInteractionSchema = new mongoose.Schema(
  {
    // Drug Pair Information
    drug1: {
      name: {
        type: String,
        required: true,
        index: true,
      },
      genericName: String,
      drugClass: String,
      type: {
        type: String,
        enum: ["prescription", "otc", "supplement", "food", "alcohol"],
      },
    },

    drug2: {
      name: {
        type: String,
        required: true,
        index: true,
      },
      genericName: String,
      drugClass: String,
      type: {
        type: String,
        enum: ["prescription", "otc", "supplement", "food", "alcohol"],
      },
    },

    // Interaction Details
    severity: {
      type: String,
      enum: ["minor", "moderate", "major", "contraindicated"],
      required: true,
    },

    effect: {
      type: String,
      required: true,
    },

    mechanism: String,

    risks: [
      {
        description: String,
        severity: {
          type: String,
          enum: ["low", "medium", "high"],
        },
      },
    ],

    recommendations: [
      {
        type: String,
        action: {
          type: String,
          enum: ["avoid", "monitor", "adjust_dose", "timing", "consult"],
        },
        details: String,
      },
    ],

    // Clinical Evidence
    evidence: {
      level: {
        type: String,
        enum: ["theoretical", "case_studies", "clinical_trials", "established"],
      },
      sources: [
        {
          title: String,
          authors: [String],
          publication: String,
          year: Number,
          doi: String,
          url: String,
        },
      ],
      summary: String,
    },

    // Management
    management: {
      alternatives: [
        {
          drugName: String,
          reason: String,
        },
      ],
      monitoringParameters: [
        {
          parameter: String,
          frequency: String,
          threshold: String,
        },
      ],
      interventions: [
        {
          type: String,
          description: String,
          priority: {
            type: String,
            enum: ["low", "medium", "high"],
          },
        },
      ],
    },

    // Population Specific Considerations
    populationConsiderations: {
      ageGroups: [
        {
          group: String,
          considerations: String,
        },
      ],
      conditions: [
        {
          condition: String,
          impact: String,
        },
      ],
      geneticFactors: [
        {
          factor: String,
          impact: String,
        },
      ],
    },

    // Metadata
    metadata: {
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      source: String,
      version: String,
      reviewStatus: {
        type: String,
        enum: ["pending", "reviewed", "approved"],
      },
      reviewedBy: String,
      reviewDate: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Index for drug pairs
drugInteractionSchema.index(
  { "drug1.name": 1, "drug2.name": 1 },
  { unique: true }
);
drugInteractionSchema.index({ severity: 1 });

// Methods
drugInteractionSchema.methods.isContraindicated = function () {
  return this.severity === "contraindicated";
};

drugInteractionSchema.methods.requiresMonitoring = function () {
  return this.management.monitoringParameters.length > 0;
};

drugInteractionSchema.methods.getAlternatives = function () {
  return this.management.alternatives;
};

// Static methods
drugInteractionSchema.statics.findInteractions = async function (drugNames) {
  const interactions = await this.find({
    $or: [
      { "drug1.name": { $in: drugNames } },
      { "drug2.name": { $in: drugNames } },
    ],
  }).sort({ severity: -1 });

  return interactions;
};

drugInteractionSchema.statics.findByDrugPair = async function (
  drug1Name,
  drug2Name
) {
  return await this.findOne({
    $or: [
      { "drug1.name": drug1Name, "drug2.name": drug2Name },
      { "drug1.name": drug2Name, "drug2.name": drug1Name },
    ],
  });
};

const DrugInteraction = mongoose.model(
  "DrugInteraction",
  drugInteractionSchema
);

export default DrugInteraction;
