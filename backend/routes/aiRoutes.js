
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  runAppointmentAgent,
  getDoctorAppointmentOptions,
  prepareAppointmentBooking,
} = require("../services/appointmentAgentService");

const { findApprovedDoctors } = require("../services/approvedDoctorService");

// All AI endpoints require authentication.
router.use(authMiddleware);

// Patient-only access for this healthcare assistant.
function patientOnly(req, res, next) {
  if (req.user.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Only patients can use the healthcare assistant.",
    });
  }

  next();
}

router.use(patientOnly);

// ==========================================
// POST /api/ai/recommend
// Symptoms -> medical guidance + specialty + approved doctors
// ==========================================

router.post("/recommend", async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (typeof symptoms !== "string" || !symptoms.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide your symptoms.",
      });
    }

    const result = await runAppointmentAgent(symptoms);

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI recommendation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process your symptoms right now.",
    });
  }
});

// ==========================================
// GET /api/ai/doctors?specialization=Cardiologist
// Search approved doctors
// ==========================================

router.get("/doctors", async (req, res) => {
  try {
    const { specialization } = req.query;

    if (
      typeof specialization !== "string" ||
      !specialization.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Specialization is required.",
      });
    }

    const doctors = await findApprovedDoctors(specialization.trim());

    return res.status(200).json({
      success: true,
      specialization: specialization.trim(),
      totalDoctors: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("AI doctor search error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch approved doctors.",
    });
  }
});

// ==========================================
// GET /api/ai/doctors/:doctorId/slots?date=YYYY-MM-DD
// Get available appointment slots
// ==========================================

router.get("/doctors/:doctorId/slots", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID.",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required.",
      });
    }

    const result = await getDoctorAppointmentOptions(
      doctorId,
      date
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI slot retrieval error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to fetch appointment slots.",
    });
  }
});

// ==========================================
// POST /api/ai/booking-summary
// Prepare booking confirmation
// Does NOT create appointment/payment
// ==========================================

router.post("/booking-summary", async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      paymentMethod,
    } = req.body;

    const result = await prepareAppointmentBooking({
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      paymentMethod,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI booking-summary error:", error.message);

    return res.status(400).json({
      success: false,
      bookingCreated: false,
      message: error.message || "Unable to prepare booking confirmation.",
    });
  }
});

module.exports = router;
