import express from "express";
import { uploadExcel, getAllUsers, getUserByRole, deleteUser, getAdminFilters } from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { excelUpload } from "../middleware/upload.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  authorize("admin"),
  rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 5, keyFn: (req) => req.user?._id || req.ip, label: "admin-upload" }),
  excelUpload.single("file"),
  uploadExcel
);

router.get("/users", protect, authorize("admin"), getAllUsers);
router.get("/meta/filters", protect, authorize("admin"), getAdminFilters);
router.get("/users/:role", protect, authorize("admin"), getUserByRole);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

// Activity and Reporting
import { getReports, getTeacherActivities, deleteReport } from "../controllers/admin.activity.js";
router.get("/reports", protect, authorize("admin"), getReports);
router.delete("/reports/:id", protect, authorize("admin"), deleteReport);
router.get("/teacher-activities", protect, authorize("admin"), getTeacherActivities);

export default router;
