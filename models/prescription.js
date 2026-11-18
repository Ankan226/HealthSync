
const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },

    strength: {
      type: String,
      trim: true,
      default: "",
    },

    dosage: {
      type: String,
      required: true,
      trim: true,
    },

    frequency: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    route: {
      type: String,
      trim: true,
      default: "Oral",
    },

    instructions: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    symptoms: {
      type: String,
      trim: true,
      default: "",
    },

    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },

    medicines: {
      type: [medicineSchema],
      required: true,
      validate: {
        validator: function (medicines) {
          return medicines.length > 0;
        },
        message: "At least one medicine is required.",
      },
    },

    additionalInstructions: {
      type: String,
      trim: true,
      default: "",
    },

    recommendedTests: {
      type: [String],
      default: [],
    },

    followUpDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "issued"],
      default: "draft",
    },

    issuedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
