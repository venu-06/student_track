import express from "express";
import {
  postInternship,
  getInternships,
  getInternshipStats,
  postTarget,
  getTargetStats,
  viewAttendance,
  getAttendanceSessions,
  getAttendanceFilters,
  startAttendanceSession,
  endAttendanceSession,
  getStudentAttendance,
  getAttendanceStatistics,
  getPermissions,
  grantPermission,
  addAchievement,
  getStudentAchievements,
  deleteAchievement,
  sendReport,
  getMyStudents
} from "../controllers/teacher.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect, authorize("teacher"));

// Internships
router.post("/internship", postInternship);
router.get("/internships", getInternships);
router.get("/internship/:internshipId/stats", getInternshipStats);

// Targets
router.post("/target", postTarget);
router.get("/targets", getTargetStats);

// Attendance & Permissions
router.get("/attendance", viewAttendance);
router.get("/attendance/statistics", getAttendanceStatistics);
router.get("/attendance/sessions", getAttendanceSessions);
router.get("/attendance/filters", getAttendanceFilters);
router.post("/attendance/session/start", startAttendanceSession);
router.patch("/attendance/session/:id/end", endAttendanceSession);
router.get("/student/:studentId/attendance", getStudentAttendance);
router.get("/permissions", getPermissions);
router.patch("/permission", grantPermission); // Expects { permissionId, status }

// Achievements
router.post("/achievement", addAchievement);
router.get("/student/:studentId/achievements", getStudentAchievements);
router.delete("/achievement/:id", deleteAchievement);

// Report
router.post("/report", sendReport);

// Students
router.get("/my-students", getMyStudents);

export default router;
