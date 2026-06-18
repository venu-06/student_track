import mongoose from "mongoose";

const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetGroupId: { type: mongoose.Schema.Types.ObjectId, index: true },
  title: { type: String, default: "" },
  target: { type: String, default: "" },
  status: {
    type: String,
    enum: ["not_started", "ongoing", "completed"],
    default: "not_started"
  },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

export default mongoose.model("StudentTarget", schema);
