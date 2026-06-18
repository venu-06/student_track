import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const username = String(process.env.PROVISION_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || "").trim();
const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || "").trim();
const name = String(process.env.PROVISION_ADMIN_NAME || "Institute Admin").trim();

const run = async () => {
  if (!username || !password) {
    throw new Error("Set PROVISION_ADMIN_USERNAME and PROVISION_ADMIN_PASSWORD before running this script.");
  }

  await connectDB();

  const existingUser = await User.findOne({ username });
  const hashedPassword = await bcrypt.hash(password, 12);

  if (existingUser) {
    existingUser.name = name || existingUser.name;
    existingUser.password = hashedPassword;
    existingUser.role = "admin";
    existingUser.loginCount = 1;
    await existingUser.save();
    console.log(`Admin user updated: ${username}`);
    process.exit(0);
  }

  await User.create({
    name,
    username,
    password: hashedPassword,
    role: "admin",
    loginCount: 1
  });

  console.log(`Admin user created: ${username}`);
  process.exit(0);
};

run().catch((error) => {
  console.error("Admin provisioning failed:", error.message);
  process.exit(1);
});
