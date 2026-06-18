import mongoose from "mongoose";

const schema = new mongoose.Schema({
  internship: { type: mongoose.Schema.Types.ObjectId, ref: "Internship" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  applied: { type: Boolean, default: false },
  appliedAt: Date,
  applicationProof: { type: String, default: "" },
  proofVerificationStatus: {
    type: String,
    enum: ["not_checked", "verified", "rejected", "error"],
    default: "not_checked"
  },
  proofVerificationReason: { type: String, default: "" },
  proofExtractedText: { type: String, default: "" },
  proofMatchedUrl: { type: Boolean, default: false },
  proofMatchedId: { type: Boolean, default: false },
  proofCheckedAt: { type: Date, default: null },
  shortlisted: { type: String, enum: ["shortlisted", "not_shortlisted", "pending"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("InternshipStatus", schema);
