import mongoose from "mongoose";

const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  department: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["active", "closed"], default: "active" },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
});

schema.index({ department: 1, year: 1, date: 1, status: 1 });

export default mongoose.model("AttendanceSession", schema);
