import express from "express";
import {
  markAttendance,
  getAttendanceSessionStatus,
  viewAttendance,
  getAttendanceSummary,
  viewInternships,
  applyInternship,
  updateInternshipAction,
  stopInternshipProofVerification,
  withdrawInternship,
  getMyInternshipStatus,
  getMyTargets,
  updateMyTargetStatus,
  getMyAchievements,
  addAchievement,
  shareAchievement,
  checkResumeMatch,
  getMyTeacher,
  uploadCertificate,
  getCertificates,
  deleteCertificate
} from "../controllers/student.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { documentUpload, imageUpload } from "../middleware/upload.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.use(protect, authorize("student"));

// Attendance endpoints
router.post("/attendance", rateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 12, keyFn: (req) => req.user?._id || req.ip, label: "attendance" }), imageUpload.single("imageProof"), markAttendance);
router.get("/attendance/session-status", getAttendanceSessionStatus);
router.get("/attendance", viewAttendance);
router.get("/attendance/summary", getAttendanceSummary);

// Internship endpoints
router.get("/internships", viewInternships);
router.post("/internship/apply", imageUpload.single("proof"), applyInternship);
router.patch("/internship/status", updateInternshipAction); // for shortlisting tracking
router.post("/internship/stop-verification", stopInternshipProofVerification);
router.post("/internship/withdraw", withdrawInternship);
router.get("/my-internships", getMyInternshipStatus);

// Target endpoints
router.get("/targets", getMyTargets);
router.patch("/target/:id/status", updateMyTargetStatus);

// Achievement endpoints
router.get("/achievements", getMyAchievements);
router.post("/achievement", addAchievement);
router.post("/achievement/:id/share", shareAchievement);

// Resume checker endpoint
router.post("/resume-check", documentUpload.single("resume"), checkResumeMatch);

// Teacher endpoints
router.get("/my-teacher", getMyTeacher);

// Certificate/Resume upload
router.post("/certificate", rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 10, keyFn: (req) => req.user?._id || req.ip, label: "certificate" }), documentUpload.single("file"), uploadCertificate);
router.get("/certificates", getCertificates);
router.delete("/certificate/:id", deleteCertificate);

export default router;
