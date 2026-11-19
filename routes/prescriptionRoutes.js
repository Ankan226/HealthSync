const express = require("express");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const router = express.Router();

const Prescription = require("../models/prescription");
const Appointment = require("../models/appointment");
const Doctor = require("../models/doctor");

const authMiddleware = require("../middleware/authMiddleware");
const doctorVerificationMiddleware = require("../middleware/doctorVerificationMiddleware");

// ==========================================
// POST /api/prescriptions
// Doctor creates a prescription draft
// ==========================================

router.post(
  "/",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can create prescriptions.",
        });
      }

      const {
        appointmentId,
        symptoms,
        diagnosis,
        medicines,
        additionalInstructions,
        recommendedTests,
        followUpDate,
      } = req.body;

      if (!appointmentId || !mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({
          message: "Valid appointment ID is required.",
        });
      }

      if (!diagnosis || !diagnosis.trim()) {
        return res.status(400).json({
          message: "Diagnosis is required.",
        });
      }

      if (!Array.isArray(medicines) || medicines.length === 0) {
        return res.status(400).json({
          message: "At least one medicine is required.",
        });
      }

      const appointment = await Appointment.findOne({
        _id: appointmentId,
        doctorId: req.doctor._id,
        appointmentStatus: "completed",
      });

      if (!appointment) {
        return res.status(404).json({
          message: "Completed appointment not found for this doctor.",
        });
      }

      const existingPrescription = await Prescription.findOne({
        appointmentId: appointment._id,
      });

      if (existingPrescription) {
        return res.status(409).json({
          message: "A prescription already exists for this appointment.",
        });
      }

      const prescription = await Prescription.create({
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: req.doctor._id,
        symptoms,
        diagnosis,
        medicines,
        additionalInstructions,
        recommendedTests,
        followUpDate,
        status: "draft",
      });

      return res.status(201).json({
        message: "Prescription draft created successfully.",
        prescription,
      });
    } catch (error) {
      console.error("Create prescription error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "A prescription already exists for this appointment.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Server error while creating prescription.",
      });
    }
  }
);

// ==========================================
// PATCH /api/prescriptions/:id/edit
// Doctor edits a draft prescription
// ==========================================

router.patch(
  "/:id/edit",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can edit prescriptions.",
        });
      }

      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid prescription ID.",
        });
      }

      const prescription = await Prescription.findOne({
        _id: id,
        doctorId: req.doctor._id,
      });

      if (!prescription) {
        return res.status(404).json({
          message: "Prescription not found.",
        });
      }

      if (prescription.status !== "draft") {
        return res.status(400).json({
          message: "Issued prescriptions cannot be edited.",
        });
      }

      const allowedFields = [
        "symptoms",
        "diagnosis",
        "medicines",
        "additionalInstructions",
        "recommendedTests",
        "followUpDate",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          prescription[field] = req.body[field];
        }
      }

      if (
        req.body.diagnosis !== undefined &&
        (!req.body.diagnosis || !req.body.diagnosis.trim())
      ) {
        return res.status(400).json({
          message: "Diagnosis cannot be empty.",
        });
      }

      if (
        req.body.medicines !== undefined &&
        (!Array.isArray(req.body.medicines) ||
          req.body.medicines.length === 0)
      ) {
        return res.status(400).json({
          message: "At least one medicine is required.",
        });
      }

      await prescription.save();

      return res.status(200).json({
        message: "Draft prescription updated successfully.",
        prescription,
      });
    } catch (error) {
      console.error("Edit prescription error:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Server error while editing prescription.",
      });
    }
  }
);

// ==========================================
// PATCH /api/prescriptions/:id/issue
// Doctor officially issues a prescription
// ==========================================

router.patch(
  "/:id/issue",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can issue prescriptions.",
        });
      }

      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid prescription ID.",
        });
      }

      const prescription = await Prescription.findOne({
        _id: id,
        doctorId: req.doctor._id,
      });

      if (!prescription) {
        return res.status(404).json({
          message: "Prescription not found.",
        });
      }

      if (prescription.status === "issued") {
        return res.status(400).json({
          message: "Prescription has already been issued.",
        });
      }

      prescription.status = "issued";
      prescription.issuedAt = new Date();

      await prescription.save();

      return res.status(200).json({
        message: "Prescription issued successfully.",
        prescription,
      });
    } catch (error) {
      console.error("Issue prescription error:", error);

      return res.status(500).json({
        message: "Server error while issuing prescription.",
      });
    }
  }
);

// ==========================================
// GET /api/prescriptions/doctor
// Doctor views their prescriptions
// ==========================================

router.get(
  "/doctor",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can access this route.",
        });
      }

      const prescriptions = await Prescription.find({
        doctorId: req.doctor._id,
      })
        .populate("patientId", "fullName email phoneNumber")
        .populate("appointmentId", "appointmentDate startTime endTime")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "Doctor prescriptions fetched successfully.",
        totalPrescriptions: prescriptions.length,
        prescriptions,
      });
    } catch (error) {
      console.error("Fetch doctor prescriptions error:", error);

      return res.status(500).json({
        message: "Server error while fetching prescriptions.",
      });
    }
  }
);

// ==========================================
// GET /api/prescriptions/my
// Patient views their prescriptions
// ==========================================

router.get("/my", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can view their prescriptions.",
      });
    }

    const prescriptions = await Prescription.find({
      patientId: req.user.userId,
      status: "issued",
    })
      .populate("doctorId", "specialization qualification")
      .populate("appointmentId", "appointmentDate startTime")
      .sort({ issuedAt: -1 });

    return res.status(200).json({
      message: "Patient prescriptions fetched successfully.",
      totalPrescriptions: prescriptions.length,
      prescriptions,
    });
  } catch (error) {
    console.error("Fetch patient prescriptions error:", error);

    return res.status(500).json({
      message: "Server error while fetching prescriptions.",
    });
  }
});

// ==========================================
// GET /api/prescriptions/:id/pdf
// Download prescription PDF
// ==========================================

router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid prescription ID.",
      });
    }

    let query = { _id: id };

    // Patient authorization
    if (req.user.role === "patient") {
      query.patientId = req.user.userId;
      query.status = "issued";
    }

    // Doctor authorization
    else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({
        userId: req.user.userId,
        verificationStatus: "approved",
      });

      if (!doctor) {
        return res.status(403).json({
          message: "Verified doctor account required.",
        });
      }

      query.doctorId = doctor._id;
    } else {
      return res.status(403).json({
        message: "You are not authorized to download this prescription.",
      });
    }

    const prescription = await Prescription.findOne(query)
      .populate("patientId", "fullName email phoneNumber")
      .populate({
        path: "doctorId",
        select: "specialization qualification medicalRegistrationNumber userId",
        populate: {
          path: "userId",
          select: "fullName email phoneNumber",
        },
      })
      .populate("appointmentId", "appointmentDate startTime endTime");

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found.",
      });
    }

    if (prescription.status !== "issued") {
      return res.status(400).json({
        message: "Only issued prescriptions can be downloaded.",
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const filename = `prescription-${prescription._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(24).font("Helvetica-Bold");
    doc.text("HealthSync", { align: "center" });

    doc.fontSize(10).font("Helvetica");
    doc.text("Digital Healthcare Prescription", {
      align: "center",
    });

    doc.moveDown();

    doc.moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown();

    // Doctor information
    const doctorUser = prescription.doctorId?.userId;

    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Doctor Information");

    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");

    doc.text(
      `Doctor Name: ${doctorUser?.fullName || "N/A"}`
    );

    doc.text(
      `Specialization: ${
        prescription.doctorId?.specialization || "N/A"
      }`
    );

    doc.text(
      `Qualification: ${
        prescription.doctorId?.qualification || "N/A"
      }`
    );

    doc.text(
      `Registration Number: ${
        prescription.doctorId?.medicalRegistrationNumber || "N/A"
      }`
    );

    doc.moveDown();

    // Patient information
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Patient Information");

    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");

    doc.text(
      `Patient Name: ${
        prescription.patientId?.fullName || "N/A"
      }`
    );

    doc.text(
      `Patient Email: ${
        prescription.patientId?.email || "N/A"
      }`
    );

    doc.text(
      `Patient Phone: ${
        prescription.patientId?.phoneNumber || "N/A"
      }`
    );

    doc.moveDown();

    // Appointment information
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Appointment Information");

    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");

    const appointmentDate = prescription.appointmentId?.appointmentDate
      ? new Date(
          prescription.appointmentId.appointmentDate
        ).toLocaleDateString("en-IN")
      : "N/A";

    doc.text(`Appointment Date: ${appointmentDate}`);

    doc.text(
      `Appointment Time: ${
        prescription.appointmentId?.startTime || "N/A"
      } - ${
        prescription.appointmentId?.endTime || "N/A"
      }`
    );

    doc.text(
      `Prescription Issued: ${
        prescription.issuedAt
          ? new Date(prescription.issuedAt).toLocaleDateString("en-IN")
          : "N/A"
      }`
    );

    doc.moveDown();

    // Symptoms
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Symptoms");

    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");
    doc.text(prescription.symptoms || "Not specified");

    doc.moveDown();

    // Diagnosis
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Diagnosis");

    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");
    doc.text(prescription.diagnosis || "N/A");

    doc.moveDown();

    // Medicines
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Medicines");

    doc.moveDown(0.5);

    prescription.medicines.forEach((medicine, index) => {
      doc.fontSize(11).font("Helvetica-Bold");

      doc.text(
        `${index + 1}. ${medicine.medicineName || "Medicine"}`
      );

      doc.fontSize(10).font("Helvetica");

      if (medicine.strength) {
        doc.text(`Strength: ${medicine.strength}`);
      }

      if (medicine.dosage) {
        doc.text(`Dosage: ${medicine.dosage}`);
      }

      if (medicine.frequency) {
        doc.text(`Frequency: ${medicine.frequency}`);
      }

      if (medicine.duration) {
        doc.text(`Duration: ${medicine.duration}`);
      }

      if (medicine.route) {
        doc.text(`Route: ${medicine.route}`);
      }

      if (medicine.quantity) {
        doc.text(`Quantity: ${medicine.quantity}`);
      }

      if (medicine.instructions) {
        doc.text(`Instructions: ${medicine.instructions}`);
      }

      doc.moveDown(0.5);
    });

    // Recommended tests
    if (prescription.recommendedTests) {
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("Recommended Tests");

      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");
      doc.text(prescription.recommendedTests);
    }

    // Additional instructions
    if (prescription.additionalInstructions) {
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("Additional Instructions");

      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");
      doc.text(prescription.additionalInstructions);
    }

    // Follow-up
    if (prescription.followUpDate) {
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("Follow-up");

      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");

      doc.text(
        new Date(prescription.followUpDate).toLocaleDateString("en-IN")
      );
    }

    doc.moveDown(2);

    doc.fontSize(9).font("Helvetica");
    doc.text(
      "This prescription was digitally generated through HealthSync.",
      { align: "center" }
    );

    doc.text(
      "Please consult your doctor if you have questions about your medication.",
      { align: "center" }
    );

    doc.end();
  } catch (error) {
    console.error("Prescription PDF generation error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Server error while generating prescription PDF.",
      });
    }
  }
});

// ==========================================
// GET /api/prescriptions/:id
// View one prescription
// ==========================================

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid prescription ID.",
      });
    }

    let query = { _id: id };

    if (req.user.role === "patient") {
      query.patientId = req.user.userId;
      query.status = "issued";
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({
        userId: req.user.userId,
        verificationStatus: "approved",
      });

      if (!doctor) {
        return res.status(403).json({
          message: "Verified doctor account required.",
        });
      }

      query.doctorId = doctor._id;
    } else {
      return res.status(403).json({
        message: "You are not authorized to view prescriptions.",
      });
    }

    const prescription = await Prescription.findOne(query)
      .populate("patientId", "fullName email phoneNumber")
      .populate(
        "doctorId",
        "specialization qualification medicalRegistrationNumber"
      )
      .populate("appointmentId", "appointmentDate startTime endTime");

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found.",
      });
    }

    return res.status(200).json({
      message: "Prescription fetched successfully.",
      prescription,
    });
  } catch (error) {
    console.error("Fetch prescription error:", error);

    return res.status(500).json({
      message: "Server error while fetching prescription.",
    });
  }
});

module.exports = router;