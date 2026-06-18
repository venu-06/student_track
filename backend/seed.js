import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if admin exists
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      console.log("Admin already exists");
      process.exit(0);
    }

    // Create default admin
    const admin = await User.create({
      name: "Admin",
      username: "admin",
      password: await bcrypt.hash("admin", 10),
      role: "admin",
      email: "admin@system.com",
      phone: "0000000000",
      department: "Administration",
      isFirstLogin: false
    });

    console.log("✓ Admin created successfully");
    console.log("Username: admin");
    console.log("Password: admin");

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

seedAdmin();
