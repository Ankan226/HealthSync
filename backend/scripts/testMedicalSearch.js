require("dotenv").config();

const mongoose = require("mongoose");

// Register User model before populate() runs
require("../models/user");

const Doctor = require("../models/doctor");

const { findApprovedDoctors } = require("../services/approvedDoctorService");

const {
  getAvailableAppointmentSlots,
} = require("../services/appointmentSlotService");

const {
  getDoctorAppointmentOptions,
  prepareAppointmentBooking,
} = require("../services/appointmentAgentService");

// Get tomorrow's date in India (IST)
function getTomorrowIST() {
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const todayUTC = new Date(`${todayIST}T00:00:00.000Z`);
  todayUTC.setUTCDate(todayUTC.getUTCDate() + 1);

  return todayUTC.toISOString().slice(0, 10);
}

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.\n");

    const specialization = "Cardiologist";

    // =========================================
    // TEST 1: APPROVED DOCTOR SEARCH
    // =========================================

    console.log("========== TEST 1 ==========");
    console.log(`Searching approved doctors: ${specialization}\n`);

    const doctors = await findApprovedDoctors(specialization);

    console.log("Doctors found:", doctors.length);
    console.log(JSON.stringify(doctors, null, 2));

    if (!Array.isArray(doctors)) {
      throw new Error("Expected doctor results to be an array.");
    }

    for (const doctor of doctors) {
      if (!doctor.doctorId || !doctor.name || !doctor.specialization) {
        throw new Error("A doctor result is missing required fields.");
      }
    }

    console.log("\nAPPROVED DOCTOR SEARCH TEST PASSED.");

    // =========================================
    // TEST 2: APPOINTMENT SLOT RETRIEVAL
    // =========================================

    console.log("\n========== TEST 2 ==========");

    if (doctors.length === 0) {
      console.log(
        "No approved Cardiologists found. Skipping appointment slot test."
      );
    } else {
      const selectedDoctor = doctors[0];
      const testDate = getTomorrowIST();

      console.log("Selected doctor:", selectedDoctor.name);
      console.log("Doctor ID:", selectedDoctor.doctorId);
      console.log("Testing date:", testDate);
      console.log("\nFetching available appointment slots...\n");

      const slotResult = await getAvailableAppointmentSlots(
        selectedDoctor.doctorId,
        testDate
      );

      console.log(
        "Slot retrieval result:",
        JSON.stringify(slotResult, null, 2)
      );

      if (!slotResult || !Array.isArray(slotResult.availableSlots)) {
        throw new Error("Invalid appointment slot response.");
      }

      if (slotResult.doctorId !== selectedDoctor.doctorId) {
        throw new Error("Returned doctor ID does not match selected doctor.");
      }

      if (slotResult.date !== testDate) {
        throw new Error("Returned date does not match requested date.");
      }

      for (const slot of slotResult.availableSlots) {
        if (
          !slot.startTime ||
          !slot.endTime ||
          typeof slot.durationMinutes !== "number"
        ) {
          throw new Error("An available slot is missing required fields.");
        }
      }

      console.log("\nAPPOINTMENT SLOT RETRIEVAL TEST PASSED.");
      console.log("Available slots:", slotResult.availableSlots.length);
    }

    // =========================================
    // TEST 3: APPOINTMENT AGENT SLOT OPTIONS
    // =========================================

    console.log("\n========== TEST 3 ==========");

    if (doctors.length === 0) {
      console.log(
        "No approved doctors found. Skipping appointment agent slot test."
      );
    } else {
      const selectedDoctor = doctors[0];
      const testDate = getTomorrowIST();

      console.log("Testing appointment agent slot retrieval...");
      console.log("Doctor:", selectedDoctor.name);
      console.log("Doctor ID:", selectedDoctor.doctorId);
      console.log("Date:", testDate);

      const agentResult = await getDoctorAppointmentOptions(
        selectedDoctor.doctorId,
        testDate
      );

      console.log(
        "\nAgent slot response:",
        JSON.stringify(agentResult, null, 2)
      );

      if (!agentResult.success) {
        throw new Error("Appointment agent slot retrieval failed.");
      }

      if (agentResult.doctorId !== selectedDoctor.doctorId) {
        throw new Error("Doctor ID mismatch in agent response.");
      }

      if (agentResult.date !== testDate) {
        throw new Error("Agent returned an incorrect appointment date.");
      }

      if (!Array.isArray(agentResult.availableSlots)) {
        throw new Error("Agent did not return an available slots array.");
      }

      for (const slot of agentResult.availableSlots) {
        if (
          !slot.startTime ||
          !slot.endTime ||
          typeof slot.durationMinutes !== "number"
        ) {
          throw new Error("Agent returned an invalid slot.");
        }
      }

      console.log("\nAPPOINTMENT AGENT SLOT TEST PASSED.");
      console.log("Available slots:", agentResult.availableSlots.length);
    }

    // =========================================
    // TEST 4: BOOKING CONFIRMATION PREPARATION
    // =========================================

    console.log("\n========== TEST 4 ==========");
    console.log("Testing booking confirmation preparation...\n");

    if (doctors.length === 0) {
      console.log(
        "No approved doctors found. Skipping booking confirmation test."
      );
    } else {
      const tomorrow = getTomorrowIST();

      // Find a doctor with a configured consultation fee
      const doctorRecords = await Doctor.find({
        _id: {
          $in: doctors.map((doctor) => doctor.doctorId),
        },
        verificationStatus: "approved",
      });

      const doctorWithFee = doctorRecords.find(
        (doctor) =>
          typeof doctor.consultationFee === "number" &&
          Number.isFinite(doctor.consultationFee) &&
          doctor.consultationFee >= 0
      );

      if (!doctorWithFee) {
        console.log(
          "No approved doctor has a configured fee. Skipping booking confirmation test."
        );
      } else {
        // Find available slots for this doctor
        const availableSlotResult = await getAvailableAppointmentSlots(
          doctorWithFee._id.toString(),
          tomorrow
        );

        if (availableSlotResult.availableSlots.length === 0) {
          console.log(
            "No slots available tomorrow for this doctor. Skipping booking confirmation test."
          );
        } else {
          const selectedSlot = availableSlotResult.availableSlots[0];

          console.log("Doctor ID:", doctorWithFee._id.toString());
          console.log("Date:", tomorrow);
          console.log("Selected slot:", selectedSlot);
          console.log("Payment method: UPI\n");

          // Prepare booking summary only.
          // No appointment or payment will be created here.
          const bookingResult = await prepareAppointmentBooking({
            doctorId: doctorWithFee._id.toString(),
            appointmentDate: tomorrow,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            paymentMethod: "upi",
          });

          console.log(
            "Booking confirmation response:",
            JSON.stringify(bookingResult, null, 2)
          );

          // Validate the response
          if (!bookingResult.success) {
            throw new Error("Booking confirmation preparation failed.");
          }

          if (bookingResult.flow !== "booking_confirmation") {
            throw new Error("Incorrect booking confirmation flow.");
          }

          if (bookingResult.confirmationRequired !== true) {
            throw new Error("Confirmation should be required.");
          }

          if (bookingResult.bookingCreated !== false) {
            throw new Error(
              "This test must not create an actual appointment."
            );
          }

          const summary = bookingResult.bookingSummary;

          if (!summary) {
            throw new Error("Booking summary is missing.");
          }

          if (summary.doctorId.toString() !== doctorWithFee._id.toString()) {
            throw new Error("Booking summary doctor ID mismatch.");
          }

          if (summary.appointmentDate !== tomorrow) {
            throw new Error("Booking summary date mismatch.");
          }

          if (summary.startTime !== selectedSlot.startTime) {
            throw new Error("Booking summary start time mismatch.");
          }

          if (summary.endTime !== selectedSlot.endTime) {
            throw new Error("Booking summary end time mismatch.");
          }

          if (summary.paymentMethod !== "upi") {
            throw new Error("Booking summary payment method mismatch.");
          }

          if (typeof summary.consultationFee !== "number") {
            throw new Error("Booking summary consultation fee is invalid.");
          }

          console.log("\nBOOKING CONFIRMATION PREPARATION TEST PASSED.");
          console.log("Appointment was NOT created.");
          console.log("Payment was NOT created.");
        }
      }
    }

    // =========================================
    // ALL TESTS
    // =========================================

    console.log("\n======================================");
    console.log("ALL MEDICAL SEARCH TESTS PASSED.");
    console.log("======================================");
  } catch (error) {
    console.error("\nTEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected.");
  }
}

runTest();