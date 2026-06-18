import mongoose from "mongoose";

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For teacher own attendance
  session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", default: null },
  date: String,
  hour: String,
  status: { type: String, default: "present" }, // present or absent
  purpose: { type: String, default: "" }, // Reason for absence
  permissionStatus: { type: String, enum: ["pending", "granted", "denied", null], default: null },
  location: { type: String, default: "" },
  faceImage: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Attendance", schema);
