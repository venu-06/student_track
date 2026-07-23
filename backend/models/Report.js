import mongoose from "mongoose";

const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  storageProvider: { type: String, enum: ["local", "cloudinary"], default: "local" },
  cloudinaryPublicId: { type: String, default: "" },
  cloudinaryResourceType: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Report", schema);