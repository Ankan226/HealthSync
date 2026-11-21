const mongoose = require("mongoose");

const Doctor = require("../models/doctor");
const DoctorSchedule = require("../models/doctorSchedule");
const Appointment = require("../models/appointment");

// Convert HH:mm to minutes
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to HH:mm
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Get today's date in IST
function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Get current time in IST as HH:mm
function getCurrentTimeIST() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

// Validate YYYY-MM-DD date
function isValidDateString(date) {
  if (typeof date !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

// Convert YYYY-MM-DD to UTC date
function dateStringToUTCDate(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

// Get weekday from date
function getDayOfWeek(date) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

// Find booked or temporarily held slots
async function getBlockedAppointments(doctorId, date) {
  const appointmentDate = dateStringToUTCDate(date);
  const now = new Date();

  return Appointment.find({
    doctorId,
    appointmentDate,

    $or: [
      // Confirmed appointments block the slot
      {
        appointmentStatus: "confirmed",
      },

      // Pending cash appointments block the slot
      {
        appointmentStatus: "pending",
        paymentMethod: "cash",
      },

      // Pending online payments block only while hold is active
      {
        appointmentStatus: "pending",
        paymentMethod: { $in: ["upi", "card"] },
        paymentStatus: "pending",
        onlinePaymentExpiresAt: { $gt: now },
      },
    ],
  })
    .select("startTime endTime")
    .lean();
}

// Main function
async function getAvailableAppointmentSlots(doctorId, date) {
  // Validate input
  if (!mongoose.isValidObjectId(doctorId) || !isValidDateString(date)) {
    throw new Error("Invalid doctor ID or date.");
  }

  // Prevent past dates
  const todayIST = getTodayIST();

  if (date < todayIST) {
    throw new Error("Cannot check appointment slots for a past date.");
  }

  // Find approved doctor
  const doctor = await Doctor.findOne({
    _id: doctorId,
    verificationStatus: "approved",
  })
    .select("_id specialization consultationFee")
    .lean();

  if (!doctor) {
    throw new Error("Approved doctor not found.");
  }

  // Find date-specific schedule first
  const dateSchedule = await DoctorSchedule.findOne({
    doctorId,
    scheduleType: "date",
    date,
  }).lean();

  let schedule;

  if (dateSchedule) {
    // Date-specific schedule overrides weekly schedule
    schedule = dateSchedule;
  } else {
    // Fall back to weekly schedule
    const dayOfWeek = getDayOfWeek(date);

    schedule = await DoctorSchedule.findOne({
      doctorId,
      scheduleType: "weekly",
      dayOfWeek,
    }).lean();
  }

  // No schedule found
  if (!schedule) {
    return {
      doctorId: doctor._id.toString(),
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
      date,
      availableSlots: [],
      message: "Doctor has no schedule for this date.",
    };
  }

  // Doctor is unavailable for this date
  if (!schedule.isAvailable || !schedule.timeSlots?.length) {
    return {
      doctorId: doctor._id.toString(),
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
      date,
      availableSlots: [],
      message: "Doctor is unavailable on this date.",
    };
  }

  // Get booked and active payment-held appointments
  const blockedAppointments = await getBlockedAppointments(
    doctor._id,
    date
  );

  // Generate available slots
  const availableSlots = [];

  for (const timeRange of schedule.timeSlots) {
    const scheduleStart = timeToMinutes(timeRange.startTime);
    const scheduleEnd = timeToMinutes(timeRange.endTime);
    const duration = timeRange.slotDurationMinutes;

    for (
      let start = scheduleStart;
      start + duration <= scheduleEnd;
      start += duration
    ) {
      const end = start + duration;

      const startTime = minutesToTime(start);
      const endTime = minutesToTime(end);

      // Ignore slots that are already in the past today (IST)
      if (date === todayIST && startTime <= getCurrentTimeIST()) {
        continue;
      }

      // Check appointment conflicts
      const hasConflict = blockedAppointments.some((appointment) => {
        const appointmentStart = timeToMinutes(appointment.startTime);
        const appointmentEnd = timeToMinutes(appointment.endTime);

        return start < appointmentEnd && end > appointmentStart;
      });

      if (!hasConflict) {
        availableSlots.push({
          startTime,
          endTime,
          durationMinutes: duration,
        });
      }
    }
  }

  return {
    doctorId: doctor._id.toString(),
    specialization: doctor.specialization,
    consultationFee: doctor.consultationFee,
    date,
    availableSlots,
    message:
      availableSlots.length > 0
        ? "Available appointment slots found."
        : "No available appointment slots for this date.",
  };
}

module.exports = {
  getAvailableAppointmentSlots,
};