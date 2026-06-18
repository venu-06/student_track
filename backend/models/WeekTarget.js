import mongoose from "mongoose";

const schema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  target: { type: String, default: "" },
  weekStart: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("WeekTarget", schema);