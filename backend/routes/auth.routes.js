import express from "express";
import { login, updateLoginCount } from "../controllers/auth.controller.js";
import { getFaceStatus, registerFace, verifyFace } from "../controllers/face.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();
router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, label: "login" }), login);
router.post("/update-login-count", protect, updateLoginCount);
router.get("/face-status/:username", protect, getFaceStatus);
router.post("/face/register", protect, rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 8, keyFn: (req) => req.user?._id || req.ip, label: "face-register" }), registerFace);
router.post("/face/verify", protect, rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 20, keyFn: (req) => req.user?._id || req.ip, label: "face-verify" }), verifyFace);

export default router;
