const mongoose = require("mongoose");

const { askHealthcareAssistant } = require("./healthcareAssistantService");
const { recommendDoctorSpecialty } = require("./doctorRecommendationService");
const { findApprovedDoctors } = require("./approvedDoctorService");
const { getAvailableAppointmentSlots } = require("./appointmentSlotService");

const Doctor = require("../models/doctor");

// ==========================================
// FEATURE 1: HEALTHCARE + DOCTOR RECOMMENDATION
// ==========================================

async function runAppointmentAgent(symptoms) {
  if (typeof symptoms !== "string" || !symptoms.trim()) {
    throw new Error("Please provide valid symptoms.");
  }

  const userSymptoms = symptoms.trim();
  const startTime = Date.now();

  // STEP 1: Medical guidance and emergency detection
  const medicalResult = await askHealthcareAssistant(userSymptoms);

  // STEP 2: Emergency detected → bypass doctor booking suggestions
  if (medicalResult.emergencyDetected) {
    return {
      success: true,
      flow: "emergency",
      emergencyDetected: true,
      riskLevel: medicalResult.riskLevel,
      answer: medicalResult.answer,
      doctors: [],
      recommendedSpecialty: null,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // STEP 3: Recommend a medical specialty
  const specialtyResult = await recommendDoctorSpecialty(userSymptoms);

  // STEP 4: If specialty is unclear
  if (!specialtyResult.specialization) {
    return {
      success: true,
      flow: "medical_guidance",
      emergencyDetected: false,
      riskLevel: medicalResult.riskLevel,
      medicalAnswer: medicalResult.answer,
      recommendedSpecialty: null,
      specialtyReason: specialtyResult.reason,
      doctors: [],
      message:
        "I couldn't confidently recommend a specialty. Consider consulting a general physician for an initial assessment.",
      processingTimeMs: Date.now() - startTime,
    };
  }

  // STEP 5: Find approved doctors for the recommended specialty
  const doctors = await findApprovedDoctors(
    specialtyResult.specialization
  );

  // STEP 6: Return medical guidance + doctor recommendations
  return {
    success: true,
    flow: "doctor_recommendation",
    emergencyDetected: false,
    riskLevel: medicalResult.riskLevel,
    medicalAnswer: medicalResult.answer,
    sources: medicalResult.sources,
    recommendedSpecialty: specialtyResult.specialization,
    specialtyReason: specialtyResult.reason,
    doctors,
    message:
      doctors.length > 0
        ? `I found ${doctors.length} approved ${specialtyResult.specialization} doctor(s). Select a doctor to see available slots.`
        : `No approved doctors are currently available for ${specialtyResult.specialization}.`,
    processingTimeMs: Date.now() - startTime,
  };
}

// ==========================================
// GET AVAILABLE APPOINTMENT SLOTS
// ==========================================

async function getDoctorAppointmentOptions(doctorId, date) {
  if (!doctorId || !date) {
    throw new Error("Doctor ID and appointment date are required.");
  }

  const startTime = Date.now();

  const slotResult = await getAvailableAppointmentSlots(doctorId, date);

  return {
    success: true,
    flow: "appointment_slots",
    doctorId: slotResult.doctorId,
    specialization: slotResult.specialization,
    consultationFee: slotResult.consultationFee,
    date: slotResult.date,
    availableSlots: slotResult.availableSlots,
    message: slotResult.message,
    processingTimeMs: Date.now() - startTime,
  };
}

// ==========================================
// PREPARE BOOKING CONFIRMATION
// Does NOT create an appointment.
// ==========================================

async function prepareAppointmentBooking({
  doctorId,
  appointmentDate,
  startTime,
  endTime,
  paymentMethod,
}) {
  const startTimeMs = Date.now();

  // STEP 1: Validate doctor ID
  if (!mongoose.isValidObjectId(doctorId)) {
    throw new Error("Invalid doctor ID.");
  }

  // STEP 2: Validate date format
  if (
    typeof appointmentDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)
  ) {
    throw new Error("Appointment date must be in YYYY-MM-DD format.");
  }

  // STEP 3: Validate that date actually exists
  const parsedDate = new Date(`${appointmentDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== appointmentDate
  ) {
    throw new Error("Invalid appointment date.");
  }

  // STEP 4: Validate time format
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new Error("Invalid appointment time.");
  }

  // STEP 5: Validate payment method
  const allowedPaymentMethods = ["upi", "card", "cash"];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Payment method must be UPI, card, or cash.");
  }

  // STEP 6: Check that the doctor is approved
  const doctor = await Doctor.findOne({
    _id: doctorId,
    verificationStatus: "approved",
  }).populate("userId", "fullName");

  if (!doctor) {
    throw new Error("Doctor not found or not approved.");
  }

  // STEP 7: Get the real available slots again
  const slotResult = await getAvailableAppointmentSlots(
    doctorId,
    appointmentDate
  );

  // STEP 8: Verify that the selected slot is actually available
  const selectedSlot = slotResult.availableSlots.find(
    (slot) =>
      slot.startTime === startTime &&
      slot.endTime === endTime
  );

  if (!selectedSlot) {
    throw new Error(
      "This appointment slot is no longer available. Please select another slot."
    );
  }

  // STEP 9: Validate consultation fee
  const consultationFee = doctor.consultationFee;

  if (
    typeof consultationFee !== "number" ||
    !Number.isFinite(consultationFee) ||
    consultationFee < 0
  ) {
    throw new Error(
      "Doctor's consultation fee is not configured correctly."
    );
  }

  // STEP 10: Calculate appointment duration
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes <= 0) {
    throw new Error("Invalid appointment duration.");
  }

  // STEP 11: Prepare confirmation summary
  const doctorName = doctor.userId?.fullName || "Selected Doctor";

  return {
    success: true,
    flow: "booking_confirmation",

    confirmationRequired: true,
    bookingCreated: false,

    bookingSummary: {
      doctorId: doctor._id,
      doctorName,
      specialization: doctor.specialization,
      appointmentDate,
      startTime,
      endTime,
      durationMinutes,
      consultationFee,
      currency: "INR",
      paymentMethod,
    },

    message:
      "Please review your appointment details and confirm to proceed with booking.",

    processingTimeMs: Date.now() - startTimeMs,
  };
}

// ==========================================
// EXPORT SERVICES
// ==========================================

module.exports = {
  runAppointmentAgent,
  getDoctorAppointmentOptions,
  prepareAppointmentBooking,
};