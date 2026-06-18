import mongoose from "mongoose";

const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

export default mongoose.model("TeacherStudentMap", schema);
