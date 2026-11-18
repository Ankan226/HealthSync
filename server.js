
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const paymentWebhookRoutes = require("./routes/paymentWebhookRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");

const app = express();
app.use("/api/prescriptions", prescriptionRoutes);

// Razorpay webhook MUST come before express.json()
app.use(
  "/api/payments/razorpay/webhook",
  express.raw({ type: "application/json" }),
  paymentWebhookRoutes
);

// Parse JSON for other API routes
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/doctor/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);

// Health check – used by Render to verify the service is running
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from the Healthsync backend!",
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected database:", mongoose.connection.name);
    console.log("MongoDB Atlas connected successfully!");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
