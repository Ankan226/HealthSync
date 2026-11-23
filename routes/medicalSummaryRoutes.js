const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const MedicalReport = require("../models/medicalReport");
const Prescription = require("../models/prescription");

const {
  extractDocumentText,
} = require("../services/documentExtractionService");

const {
  SUPPORTED_LANGUAGES,
  summarizeMedicalDocument,
} = require("../services/medicalSummarizationService");

// ------------------------------------------
// Patient-only access
// ------------------------------------------

router.use(authMiddleware);

router.use((req, res, next) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Only patients can use medical document summaries.",
    });
  }

  next();
});

// ------------------------------------------
// POST /api/medical-summary/report/:reportId
// Summarize an uploaded medical report
// ------------------------------------------

router.post("/report/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { language = "English" } = req.body;

    if (!mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID.",
      });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language.",
        supportedLanguages: SUPPORTED_LANGUAGES,
      });
    }

    // Find only the report belonging to this patient
    const report = await MedicalReport.findOne({
      _id: reportId,
      patientId: req.user.userId,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Medical report not found.",
      });
    }

    // Extract text from the original uploaded file
    const extractedText = await extractDocumentText(report);

    // Generate patient-friendly explanation
    const result = await summarizeMedicalDocument({
      extractedText,
      documentType: "report",
      language,
    });

    return res.status(200).json({
      success: true,
      message: "Medical report explained successfully.",
      reportId: report._id,
      reportTitle: report.title,
      result,
    });
  } catch (error) {
    console.error("Medical report summarization error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to summarize the medical report.",
    });
  }
});

// ------------------------------------------
// POST /api/medical-summary/prescription/:prescriptionId
// Explain an issued prescription
// ------------------------------------------

router.post("/prescription/:prescriptionId", async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { language = "English" } = req.body;

    if (!mongoose.isValidObjectId(prescriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription ID.",
      });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language.",
        supportedLanguages: SUPPORTED_LANGUAGES,
      });
    }

    // Patients can access only their own issued prescriptions
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patientId: req.user.userId,
      status: "issued",
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Issued prescription not found.",
      });
    }

    // Convert stored prescription fields into source text
    const medicineText = (prescription.medicines || [])
      .map((medicine, index) => {
        return `
Medicine ${index + 1}:
Name: ${medicine.name || "Not specified"}
Strength: ${medicine.strength || "Not specified"}
Dosage: ${medicine.dosage || "Not specified"}
Frequency: ${medicine.frequency || "Not specified"}
Duration: ${medicine.duration || "Not specified"}
Route: ${medicine.route || "Not specified"}
Instructions: ${medicine.instructions || "Not specified"}
Quantity: ${medicine.quantity || "Not specified"}
`;
      })
      .join("\n");

    const extractedText = `
PRESCRIPTION DETAILS

Symptoms:
${prescription.symptoms || "Not specified"}

Diagnosis written by doctor:
${prescription.diagnosis || "Not specified"}

Medicines:
${medicineText || "No medicines listed"}

Additional instructions:
${prescription.additionalInstructions || "Not specified"}

Recommended tests:
${prescription.recommendedTests || "Not specified"}

Follow-up date:
${
  prescription.followUpDate
    ? new Date(prescription.followUpDate).toISOString().split("T")[0]
    : "Not specified"
}
`;

    // Explain the prescription without changing its instructions
    const result = await summarizeMedicalDocument({
      extractedText,
      documentType: "prescription",
      language,
    });

    return res.status(200).json({
      success: true,
      message: "Prescription explained successfully.",
      prescriptionId: prescription._id,
      result,
    });
  } catch (error) {
    console.error("Prescription summarization error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to explain the prescription.",
    });
  }
});

module.exports = router;