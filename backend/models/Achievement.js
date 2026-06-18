import mongoose from "mongoose";

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  description: String,
  shared: { type: Boolean, default: false },
  sharedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Achievement", schema);
