const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { createWorker } = require("tesseract.js");

// Maximum document size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Local uploads directory
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

// ------------------------------------------
// Retrieve document buffer
// Supports local storage and Cloudinary
// ------------------------------------------

async function getDocumentBuffer(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Document file path is missing.");
  }

  // Cloudinary document
  if (filePath.startsWith("https://")) {
    const url = new URL(filePath);

    // Only allow Cloudinary document URLs
    if (url.hostname !== "res.cloudinary.com") {
      throw new Error("Unsupported cloud document URL.");
    }

    const response = await fetch(filePath, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(
        `Unable to retrieve cloud document (${response.status}).`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("Document exceeds the 10 MB size limit.");
    }

    return buffer;
  }

  // Local document
  let localPath;

  if (path.isAbsolute(filePath)) {
    localPath = path.resolve(filePath);
  } else {
    localPath = path.resolve(
      __dirname,
      "..",
      filePath
    );
  }

  // Prevent reading files outside uploads directory
  const relativePath = path.relative(UPLOADS_DIR, localPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid local document path.");
  }

  if (!fs.existsSync(localPath)) {
    throw new Error("Document file was not found on the server.");
  }

  const stats = fs.statSync(localPath);

  if (!stats.isFile()) {
    throw new Error("Invalid document file.");
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error("Document exceeds the 10 MB size limit.");
  }

  return fs.readFileSync(localPath);
}

// ------------------------------------------
// Extract text from PDF
// ------------------------------------------

async function extractPdfText(buffer) {
  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

// ------------------------------------------
// Extract text from image using OCR
// ------------------------------------------

async function extractImageText(buffer) {
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(buffer);

    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

// ------------------------------------------
// Main extraction function
// ------------------------------------------

async function extractDocumentText(report) {
  if (!report) {
    throw new Error("Medical report is required.");
  }

  const filePath = report.filePath;
  const fileType = report.fileType;
  const fileName = report.fileName || "";

  const buffer = await getDocumentBuffer(filePath);

  let extractedText = "";

  if (
    fileType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf")
  ) {
    extractedText = await extractPdfText(buffer);
  } else if (
    fileType === "image/jpeg" ||
    fileType === "image/png" ||
    fileName.toLowerCase().endsWith(".jpg") ||
    fileName.toLowerCase().endsWith(".jpeg") ||
    fileName.toLowerCase().endsWith(".png")
  ) {
    extractedText = await extractImageText(buffer);
  } else {
    throw new Error("Unsupported document format.");
  }

  extractedText = extractedText.trim();

  if (!extractedText) {
    throw new Error(
      "No readable text was found in the document. It may be blurry, empty, or require OCR."
    );
  }

  return extractedText;
}

module.exports = {
  getDocumentBuffer,
  extractPdfText,
  extractImageText,
  extractDocumentText,
};