import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret, shouldSetupDefaultAdmin } from "../config/env.js";
import { writeAuditLog } from "../middleware/audit.js";

export const login = async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) return res.status(400).json({ message: "username and password required" });

  try {
    const user = await User.findOne({ username });
    if (!user) {
      writeAuditLog({ req, action: "AUTH_LOGIN", status: "FAILED", details: { targetUsername: username, reason: "user_not_found" } });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // For first login, password might be plain text (e.g. from excel import)
    // Wait, in admin.controller.js we actually hashed it.
    // So all passwords are Hash. Let's just compare hash.
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      writeAuditLog({ req, action: "AUTH_LOGIN", status: "FAILED", details: { targetUsername: username, reason: "invalid_password" } });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isFirstLogin && user.role === "student") {
      user.isFirstLogin = false;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || "12h" });
    writeAuditLog({ req, action: "AUTH_LOGIN", details: { targetUsername: username } });

    res.json({
      token,
      role: user.role,
      loginCount: user.loginCount,
      name: user.name,
      username: user.username
    });
  } catch (err) {
    console.error(err);
    writeAuditLog({ req, action: "AUTH_LOGIN", status: "FAILED", details: { targetUsername: username, reason: err.message } });
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLoginCount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.loginCount = 1;
    await user.save();

    res.json({ message: "Login count updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Default Admin creation (if no admin exists)
export const setupDefaultAdmin = async () => {
  try {
    if (!shouldSetupDefaultAdmin()) {
      const adminExists = await User.findOne({ role: "admin" });
      if (!adminExists) {
        console.warn("No admin account exists. Run `npm run provision-admin` in the backend before production use.");
      } else {
        console.log("Default admin auto-creation is disabled in production.");
      }
      return;
    }

    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin";
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      await User.create({
        name: "Super Admin",
        username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
        password: hashedPassword,
        role: "admin",
        loginCount: 1 // Admin doesn't need face verification
      });
      console.log("Default admin created from environment-backed setup.");
    }
  } catch (error) {
    console.error("Error creating default admin", error);
  }
};
