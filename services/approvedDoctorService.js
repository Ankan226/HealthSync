const Doctor = require("../models/doctor");

async function findApprovedDoctors(specialization) {
  if (
    typeof specialization !== "string" ||
    !specialization.trim()
  ) {
    throw new Error("A valid specialization is required.");
  }

  const cleanSpecialization = specialization.trim();

  // Find only approved doctors with the requested specialty
  const doctors = await Doctor.find({
    verificationStatus: "approved",
    specialization: {
      $regex: new RegExp(`^${cleanSpecialization}$`, "i"),
    },
  })
    .populate("userId", "fullName email phoneNumber")
    .select(
      "userId specialization qualification experience consultationFee verificationStatus"
    )
    .lean();

  // Return a clean doctor list for the AI agent
  return doctors
    .filter((doctor) => doctor.userId)
    .map((doctor) => ({
      doctorId: doctor._id.toString(),
      name: doctor.userId.fullName,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      consultationFee: doctor.consultationFee,
    }));
}

module.exports = {
  findApprovedDoctors,
};