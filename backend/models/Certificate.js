import mongoose from "mongoose";

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, default: "" },
  purpose: { type: String, default: "" },
  fileName: { type: String, default: "" },
  originalName: { type: String, default: "" },
  storageProvider: { type: String, enum: ["local", "cloudinary"], default: "local" },
  cloudinaryPublicId: { type: String, default: "" },
  cloudinaryResourceType: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Certificate", schema);