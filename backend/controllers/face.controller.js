import axios from "axios";
import { writeAuditLog } from "../middleware/audit.js";

const FACE_SERVICE_URL = (process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const FACE_REQUEST_TIMEOUT = Number(process.env.FACE_REQUEST_TIMEOUT_MS || 15000);
const MAX_FACE_IMAGE_LENGTH = Number(process.env.FACE_MAX_BASE64_LENGTH || 3_000_000);

const isAllowedUsername = (value = "") => /^[A-Za-z0-9_-]+$/.test(String(value).trim());

const validateFacePayload = (req, res) => {
  const username = String(req.body?.username || "").trim();
  const image = String(req.body?.image || "");

  if (!username || !image) {
    res.status(400).json({ message: "username and image are required" });
    return null;
  }

  if (!isAllowedUsername(username)) {
    res.status(400).json({ message: "Invalid username format" });
    return null;
  }

  if (req.user.role !== "admin" && req.user.username !== username) {
    res.status(403).json({ message: "You can only verify or register your own face" });
    return null;
  }

  if (image.length > MAX_FACE_IMAGE_LENGTH) {
    res.status(413).json({ message: "Image payload is too large" });
    return null;
  }

  if (!image.startsWith("data:image")) {
    res.status(400).json({ message: "Invalid image format" });
    return null;
  }

  return { username, image };
};

const forwardFaceRequest = async ({ path, payload }) => {
  const response = await axios.post(`${FACE_SERVICE_URL}${path}`, payload, {
    timeout: FACE_REQUEST_TIMEOUT,
    headers: { "Content-Type": "application/json" }
  });
  return response.data;
};

export const registerFace = async (req, res) => {
  const payload = validateFacePayload(req, res);
  if (!payload) return;

  try {
    const data = await forwardFaceRequest({ path: "/register-face", payload });
    writeAuditLog({ req, action: "FACE_REGISTER", details: { username: payload.username } });
    res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 502;
    const message = error.response?.data?.error || error.response?.data?.message || "Face registration service unavailable";
    writeAuditLog({ req, action: "FACE_REGISTER", status: "FAILED", details: { username: payload.username, reason: message } });
    res.status(status).json({ success: false, error: message });
  }
};

export const verifyFace = async (req, res) => {
  const payload = validateFacePayload(req, res);
  if (!payload) return;

  try {
    const data = await forwardFaceRequest({ path: "/mark-attendance", payload });
    writeAuditLog({ req, action: "FACE_VERIFY", details: { username: payload.username, match: !!data.match } });
    res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 502;
    const message = error.response?.data?.error || error.response?.data?.message || "Face verification service unavailable";
    writeAuditLog({ req, action: "FACE_VERIFY", status: "FAILED", details: { username: payload.username, reason: message } });
    res.status(status).json({ match: false, error: message });
  }
};

export const getFaceStatus = async (req, res) => {
  const username = String(req.params.username || "").trim();
  if (!isAllowedUsername(username)) {
    return res.status(400).json({ message: "Invalid username format" });
  }

  if (req.user.role !== "admin" && req.user.username !== username) {
    return res.status(403).json({ message: "You can only view your own face status" });
  }

  try {
    const response = await axios.get(`${FACE_SERVICE_URL}/face-status/${encodeURIComponent(username)}`, {
      timeout: FACE_REQUEST_TIMEOUT
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    const message = error.response?.data?.error || error.response?.data?.message || "Face status service unavailable";
    res.status(status).json({ success: false, error: message });
  }
};
