import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "teacher", "student"] },
  email: String,
  phone: String,
  department: String,
  year: String,
  profileImage: String,
  teacherName: { type: String, default: "" }, // For students to reference their teacher
  assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isFirstLogin: { type: Boolean, default: true },
  loginCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
