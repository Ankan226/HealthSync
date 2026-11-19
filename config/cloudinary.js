const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder based on route / file context
    let folderName = "healthsync/general";
    if (req.originalUrl && req.originalUrl.includes("doctor")) {
      folderName = "healthsync/doctor_licenses";
    } else if (req.originalUrl && req.originalUrl.includes("reports")) {
      folderName = "healthsync/medical_reports";
    }

    const isPdf = file.mimetype === "application/pdf";

    return {
      folder: folderName,
      resource_type: isPdf ? "raw" : "image",
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

module.exports = {
  cloudinary,
  storage,
};
