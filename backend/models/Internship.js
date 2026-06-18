import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: String,
  url: String,
  description: { type: String, default: "" },
  deadline: { type: Date, default: null },
  department: { type: String, default: "" },
  year: { type: String, default: "" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Internship", schema);
