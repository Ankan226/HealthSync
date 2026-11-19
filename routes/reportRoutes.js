const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const MedicalReport = require("../models/medicalReport");
const User = require("../models/user");
const Doctor = require("../models/doctor");
const Appointment = require("../models/appointment");

const authMiddleware = require("../middleware/authMiddleware");
const doctorVerificationMiddleware = require("../middleware/doctorVerificationMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ==========================================
// 1. POST /api/reports/upload
// Doctor uploads a report (image or PDF) for a patient
// ==========================================
router.post(
  "/upload",
  authMiddleware,
  doctorVerificationMiddleware,
  upload.single("reportFile"),
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          message: "Only verified doctors can upload medical reports.",
        });
      }

      const { patientId, title, description, appointmentId, reportDate } =
        req.body;

      if (!req.file) {
        return res.status(400).json({
          message: "Report file (JPG, PNG, or PDF) is required.",
        });
      }

      if (!patientId || !mongoose.isValidObjectId(patientId)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message: "A valid patientId is required.",
        });
      }

      if (!title || !title.trim()) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message: "Report title is required.",
        });
      }

      const patient = await User.findOne({ _id: patientId, role: "patient" });
      if (!patient) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({
          message: "Patient not found.",
        });
      }

      let validAppointmentId = null;
      if (appointmentId) {
        if (!mongoose.isValidObjectId(appointmentId)) {
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            message: "Invalid appointment ID.",
          });
        }
        const appt = await Appointment.findById(appointmentId);
        if (appt) {
          validAppointmentId = appt._id;
        }
      }

      const report = await MedicalReport.create({
        patientId: patient._id,
        doctorId: req.doctor._id,
        appointmentId: validAppointmentId,
        title: title.trim(),
        description: description ? description.trim() : "",
        reportDate: reportDate ? new Date(reportDate) : new Date(),
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      });

      return res.status(201).json({
        message: "Medical report uploaded successfully.",
        report,
      });
    } catch (error) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error("Report upload error:", error);
      return res.status(500).json({
        message: "Server error while uploading report.",
      });
    }
  }
);

// ==========================================
// 2. GET /api/reports/patient/my
// Logged-in patient views all their reports
// ==========================================
router.get("/patient/my", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can view their reports from this route.",
      });
    }

    const reports = await MedicalReport.find({ patientId: req.user.userId })
      .populate({
        path: "doctorId",
        select: "specialization qualification",
        populate: {
          path: "userId",
          select: "fullName email phoneNumber",
        },
      })
      .populate("appointmentId", "appointmentDate startTime endTime")
      .sort({ reportDate: -1, createdAt: -1 });

    return res.status(200).json({
      message: "Patient reports fetched successfully.",
      totalReports: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Fetch patient reports error:", error);
    return res.status(500).json({
      message: "Server error while fetching reports.",
    });
  }
});

// ==========================================
// 3. GET /api/reports/doctor/patient/:patientId
// Doctor views reports for a specific patient
// ==========================================
router.get(
  "/doctor/patient/:patientId",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can access this route.",
        });
      }

      const { patientId } = req.params;
      if (!mongoose.isValidObjectId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID.",
        });
      }

      const reports = await MedicalReport.find({ patientId })
        .populate("patientId", "fullName email phoneNumber dateOfBirth")
        .populate({
          path: "doctorId",
          select: "specialization qualification",
          populate: {
            path: "userId",
            select: "fullName",
          },
        })
        .populate("appointmentId", "appointmentDate startTime")
        .sort({ reportDate: -1 });

      return res.status(200).json({
        message: "Patient reports fetched successfully.",
        totalReports: reports.length,
        reports,
      });
    } catch (error) {
      console.error("Doctor fetch patient reports error:", error);
      return res.status(500).json({
        message: "Server error while fetching patient reports.",
      });
    }
  }
);

// ==========================================
// 4. GET /api/reports/:id
// Get single report details
// ==========================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    const report = await MedicalReport.findById(id)
      .populate("patientId", "fullName email phoneNumber")
      .populate({
        path: "doctorId",
        select: "specialization qualification",
        populate: {
          path: "userId",
          select: "fullName",
        },
      })
      .populate("appointmentId", "appointmentDate startTime endTime");

    if (!report) {
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    // Access authorization check
    if (req.user.role === "patient") {
      if (report.patientId._id.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "Access denied to this report.",
        });
      }
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
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      message: "Report fetched successfully.",
      report,
    });
  } catch (error) {
    console.error("Fetch single report error:", error);
    return res.status(500).json({
      message: "Server error while fetching report.",
    });
  }
});

// ==========================================
// 5. GET /api/reports/:id/view
// View the report file inline in browser (image/PDF)
// ==========================================
router.get("/:id/view", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await MedicalReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    // Authorization
    if (req.user.role === "patient") {
      if (report.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({
        userId: req.user.userId,
        verificationStatus: "approved",
      });
      if (!doctor) {
        return res.status(403).json({ message: "Verified doctor account required." });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const resolvedPath = path.resolve(report.filePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        message: "Physical report file was not found on server.",
      });
    }

    res.setHeader("Content-Type", report.fileType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(report.fileName)}"`
    );

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("View report error:", error);
    return res.status(500).json({
      message: "Server error while viewing report.",
    });
  }
});

// ==========================================
// 6. GET /api/reports/:id/download
// Download the report file to device
// ==========================================
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await MedicalReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    // Authorization
    if (req.user.role === "patient") {
      if (report.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({
        userId: req.user.userId,
        verificationStatus: "approved",
      });
      if (!doctor) {
        return res.status(403).json({ message: "Verified doctor account required." });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const resolvedPath = path.resolve(report.filePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        message: "Physical report file was not found on server.",
      });
    }

    return res.download(resolvedPath, report.fileName);
  } catch (error) {
    console.error("Download report error:", error);
    return res.status(500).json({
      message: "Server error while downloading report.",
    });
  }
});

// ==========================================
// 7. DELETE /api/reports/:id
// Doctor deletes a report they uploaded
// ==========================================
router.delete(
  "/:id",
  authMiddleware,
  doctorVerificationMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "doctor") {
        return res.status(403).json({
          message: "Only doctors can delete reports.",
        });
      }

      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid report ID." });
      }

      const report = await MedicalReport.findOne({
        _id: id,
        doctorId: req.doctor._id,
      });

      if (!report) {
        return res.status(404).json({
          message: "Report not found or not owned by you.",
        });
      }

      // Delete file from storage
      if (fs.existsSync(report.filePath)) {
        fs.unlink(report.filePath, (err) => {
          if (err) console.error("Error removing file:", err);
        });
      }

      await MedicalReport.findByIdAndDelete(id);

      return res.status(200).json({
        message: "Report deleted successfully.",
      });
    } catch (error) {
      console.error("Delete report error:", error);
      return res.status(500).json({
        message: "Server error while deleting report.",
      });
    }
  }
);

module.exports = router;
