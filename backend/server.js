import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import studentRoutes from "./routes/student.routes.js";

import { setupDefaultAdmin } from "./controllers/auth.controller.js";
import { getAllowedOrigins } from "./config/env.js";

dotenv.config();
connectDB().then(() => {
  setupDefaultAdmin();
});

const app = express();
app.disable("x-powered-by");
fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("uploads/reports", { recursive: true });
fs.mkdirSync("logs", { recursive: true });
const allowedOrigins = getAllowedOrigins();

// CORS Configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: process.env.JSON_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URL_ENCODED_LIMIT || "2mb" }));

// Serve the uploads directory statically for Excel reports download
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running", environment: process.env.NODE_ENV || "development" });
});

app.use((error, req, res, next) => {
  if (error?.message === "CORS origin not allowed") {
    return res.status(403).json({ message: "Origin not allowed" });
  }
  if (error?.name === "MulterError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.message === "Invalid file extension" || error?.message === "Invalid file type") {
    return res.status(400).json({ message: error.message });
  }
  if (error) {
    console.error("Unhandled server error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
  return next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
