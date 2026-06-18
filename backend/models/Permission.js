import mongoose from "mongoose";

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: String, // Date for which leave is requested
  reason: { type: String, default: "" },
  imageProof: { type: String, default: "" }, // Optional image
  status: { type: String, enum: ["pending", "granted", "denied"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Permission", schema);
