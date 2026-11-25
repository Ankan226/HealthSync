
require("dotenv").config();

const mongoose = require("mongoose");
const MedicalReport = require("../models/medicalReport");

const {
  extractDocumentText,
} = require("../services/documentExtractionService");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const report = await MedicalReport.findById(
      "6aff318a624ef38797e6d179"
    );

    if (!report) {
      throw new Error("Report not found.");
    }

    const text = await extractDocumentText(report);

    console.log("\n========== EXTRACTED TEXT ==========\n");
    console.log(text);
    console.log("\n========== END ==========\n");
  } catch (error) {
    console.error("Extraction error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
