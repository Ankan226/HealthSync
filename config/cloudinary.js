const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

// Cloudinary storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = "healthsync/general";
    if (req.originalUrl && req.originalUrl.includes("doctor")) {
      folderName = "healthsync/doctor_licenses";
    } else if (req.originalUrl && req.originalUrl.includes("reports")) {
      folderName = "healthsync/medical_reports";
    }

    const isPdf = file.mimetype === "application/pdf";

    return {
      folder: folderName,
      resource_type: isPdf ? "raw" : "auto",
    };
  },
});

module.exports = {
  cloudinary,
  storage,
};
