import xlsx from "xlsx";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import TeacherStudentMap from "../models/TeacherStudentMap.js";
import Attendance from "../models/Attendance.js";
import Internship from "../models/Internship.js";
import InternshipStatus from "../models/InternshipStatus.js";
import Achievement from "../models/Achievement.js";
import Permission from "../models/Permission.js";
import Certificate from "../models/Certificate.js";
import StudentTarget from "../models/StudentTarget.js";
import { getMailFrom, isMailConfigured, transporter } from "../config/mail.js";
import { deleteFaceByUsername } from "../utils/faceStore.js";
import { writeAuditLog } from "../middleware/audit.js";
import { normalizeAcademicYear, normalizeDepartment } from "../config/normalization.js";

const APP_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const FACE_REGISTRATION_URL = process.env.FACE_REGISTRATION_URL || `${APP_URL}/face-register`;

const normalizeKey = (key = "") =>
  String(key)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const getRowValue = (row, aliases = []) => {
  const normalizedRow = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    const value = normalizedRow[normalizeKey(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
};

const sendCredentialsMail = async ({ to, subject, text }) => {
  if (!to) {
    return { sent: false, reason: "missing_email" };
  }

  if (!isMailConfigured || !transporter) {
    return { sent: false, reason: "mail_not_configured" };
  }

  try {
    await transporter.sendMail({ from: getMailFrom(), to, subject, text });
    return { sent: true };
  } catch (error) {
    console.error(`Failed to send credentials email to ${to}`, error.message);
    return { sent: false, reason: error.message || "send_failed" };
  }
};

const teacherDepartmentAliases = [
  "teacherdepartment",
  "teacher department",
  "teacherdept",
  "teacher dept",
  "facultydepartment",
  "faculty department",
  "facultydept",
  "faculty dept"
];

const studentDepartmentAliases = [
  "studentdepartment",
  "student department",
  "studentdept",
  "student dept",
  "studdepartment",
  "stud department",
  "studdept",
  "stud dept",
  "studentbranch",
  "student branch"
];

const studentYearAliases = [
  "studentyear",
  "student year",
  "yearofstudy",
  "year of study",
  "academicyear",
  "academic year",
  "studyyear",
  "study year",
  "currentyear",
  "current year"
];

const assignedTeacherAliases = [
  "assignedteacherusername",
  "assigned teacher username",
  "assignedteacher",
  "assigned teacher",
  "mentorusername",
  "mentor username"
];
const normalizeString = (value = "") => String(value).trim().replace(/\s+/g, " ");

const syncTeacherStudentMap = async (teacherId, studentId) => {
  if (!teacherId || !studentId) return;

  await TeacherStudentMap.updateMany(
    { teacher: { $ne: teacherId } },
    { $pull: { students: studentId } }
  );

  const map = await TeacherStudentMap.findOne({ teacher: teacherId });
  if (!map) {
    await TeacherStudentMap.create({ teacher: teacherId, students: [studentId] });
    return;
  }

  if (!map.students.some((id) => id.toString() === studentId.toString())) {
    map.students.push(studentId);
    await map.save();
  }
};

export const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    const wb = xlsx.readFile(req.file.path);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    let teachersCreated = 0;
    let studentsCreated = 0;
    let studentsReassigned = 0;
    let teacherEmailsSent = 0;
    let studentEmailsSent = 0;
    let teacherEmailsSkipped = 0;
    let studentEmailsSkipped = 0;
    let teacherEmailsFailed = 0;
    let studentEmailsFailed = 0;
    let skippedRows = 0;
    const emailFailureReasons = [];

    for (let row of data) {
      const tName = getRowValue(row, ["teacher name", "teachername", "faculty name", "facultyname"]);
      const tUsername = getRowValue(row, ["teacherusername", "teacher username", "facultyusername", "faculty username"]);
      const tPassword = String(
        getRowValue(row, ["teacherpassword", "teacher password", "facultypassword", "faculty password"]) || ""
      );
      const tMail = getRowValue(row, ["teachermail", "teacheremail", "teacher email", "facultyemail", "faculty email"]);
      const tDepartment = normalizeDepartment(getRowValue(row, teacherDepartmentAliases));
      const sRollno = String(
        getRowValue(row, ["studentrollno", "student roll no", "student rollno", "rollno", "roll number", "studentusername", "student username"]) || ""
      ).trim();
      const sMail = getRowValue(row, ["studentmail", "studentemail", "student email", "mail", "email"]);
      const sName = getRowValue(row, ["studentname", "student name", "name"]);
      const sDepartment = normalizeDepartment(getRowValue(row, studentDepartmentAliases));
      const sYear = normalizeAcademicYear(getRowValue(row, studentYearAliases));
      const assignedTeacherUsername =
        normalizeString(getRowValue(row, assignedTeacherAliases)) || normalizeString(tUsername);

      if (!tUsername) {
        skippedRows++;
        continue;
      }

      let teacher = await User.findOne({ username: tUsername });
      if (!teacher) {
        teacher = await User.create({
          name: tName,
          username: tUsername,
          password: await bcrypt.hash(tPassword, 10),
          role: "teacher",
          email: tMail,
          department: tDepartment,
          isFirstLogin: true,
          loginCount: 0
        });
        teachersCreated++;

        const teacherMailResult = await sendCredentialsMail({
          to: tMail,
          subject: "Teacher Login Credentials & Face Registration Link",
          text: `Welcome to Face Attendance System\n\nUsername: ${tUsername}\nPassword: ${tPassword}\n\nPlease click the face registration link below to login and register your face:\n${FACE_REGISTRATION_URL}`
        });

        if (teacherMailResult.sent) {
          teacherEmailsSent++;
        } else if (teacherMailResult.reason === "missing_email") {
          teacherEmailsSkipped++;
        } else {
          teacherEmailsFailed++;
          emailFailureReasons.push({ to: tMail || tUsername, reason: teacherMailResult.reason });
        }
      } else {
        teacher.name = tName || teacher.name;
        teacher.email = tMail || teacher.email;
        teacher.department = tDepartment || teacher.department;
        await teacher.save();
      }

      if (sRollno && sRollno.trim() !== "") {
        const assignedTeacher =
          assignedTeacherUsername === teacher.username
            ? teacher
            : await User.findOne({ username: assignedTeacherUsername, role: "teacher" });
        const teacherForStudent = assignedTeacher || teacher;

        let student = await User.findOne({ username: sRollno });
        if (!student) {
          student = await User.create({
            name: sName || sRollno,
            username: sRollno,
            password: await bcrypt.hash(sRollno, 10), // Default password is roll no
            role: "student",
            email: sMail, // Store student email
            department: sDepartment || teacherForStudent?.department || tDepartment || "",
            year: sYear,
            teacherName: teacherForStudent?.name || tName,
            assignedTeacher: teacherForStudent?._id || null,
            isFirstLogin: true,
            loginCount: 0
          });
          studentsCreated++;

          const studentMailResult = await sendCredentialsMail({
            to: sMail,
            subject: "Student Login Credentials & Face Registration Link",
            text: `Welcome to Face Attendance System\n\nYour account has been created.\nUsername: ${sRollno}\nPassword: ${sRollno}\n\nPlease click the face registration link below to login and complete your face registration:\n${FACE_REGISTRATION_URL}`
          });

          if (studentMailResult.sent) {
            studentEmailsSent++;
          } else if (studentMailResult.reason === "missing_email") {
            studentEmailsSkipped++;
          } else {
            studentEmailsFailed++;
            emailFailureReasons.push({ to: sMail || sRollno, reason: studentMailResult.reason });
          }
        } else {
          const previousTeacherId = student.assignedTeacher?.toString() || "";
          student.name = sName || student.name;
          student.email = sMail || student.email;
          student.department = sDepartment || student.department || teacherForStudent?.department || tDepartment || "";
          student.year = sYear || student.year || "";
          student.teacherName = teacherForStudent?.name || tName || student.teacherName;
          student.assignedTeacher = teacherForStudent?._id || null;
          await student.save();

          if (teacherForStudent?._id && previousTeacherId !== teacherForStudent._id.toString()) {
            studentsReassigned++;
          }
        }

        if (student.assignedTeacher) {
          await syncTeacherStudentMap(student.assignedTeacher, student._id);
        }
      }
    }

    res.json({
      message: "Excel processed successfully. Login credentials were emailed only for newly created teachers and students.",
      mailConfigured: isMailConfigured,
      faceRegistrationUrl: FACE_REGISTRATION_URL,
      teachersCreated,
      studentsCreated,
      studentsReassigned,
      skippedRows,
      teacherEmailsSent,
      studentEmailsSent,
      teacherEmailsSkipped,
      studentEmailsSkipped,
      teacherEmailsFailed,
      studentEmailsFailed,
      emailFailureReasons: emailFailureReasons.slice(0, 10)
    });
    writeAuditLog({
      req,
      action: "ADMIN_UPLOAD_EXCEL",
      details: { teachersCreated, studentsCreated, studentsReassigned, skippedRows, fileName: req.file.originalname }
    });
  } catch (err) {
    writeAuditLog({ req, action: "ADMIN_UPLOAD_EXCEL", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { department = "", year = "", teacherId = "" } = req.query;
    const filter = { role };

    if (department) {
      filter.department = department;
    }

    if (role === "student") {
      if (year) {
        filter.year = year;
      }
      if (teacherId) {
        const teacher = await User.findById(teacherId).select("name");
        filter.$or = [
          { assignedTeacher: teacherId },
          ...(teacher?.name ? [{ teacherName: teacher.name }] : [])
        ];
      }
    }

    const users = await User.find(filter)
      .select("-password")
      .populate("assignedTeacher", "name username department")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminFilters = async (req, res) => {
  try {
    const teacherDepartments = await User.distinct("department", { role: "teacher", department: { $nin: ["", null] } });
    const studentDepartments = await User.distinct("department", { role: "student", department: { $nin: ["", null] } });
    const years = await User.distinct("year", { role: "student", year: { $nin: ["", null] } });
    const teachers = await User.find({ role: "teacher" })
      .select("name username department")
      .sort({ name: 1 });

    res.json({
      teacherDepartments: teacherDepartments.sort(),
      studentDepartments: studentDepartments.sort(),
      years: years.sort(),
      teachers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const deletedUsernames = [];

    const deleteStudentData = async (student) => {
      await Attendance.deleteMany({ student: student._id });
      await Permission.deleteMany({ student: student._id });
      await Achievement.deleteMany({ student: student._id });
      await Certificate.deleteMany({ student: student._id });
      await InternshipStatus.deleteMany({ student: student._id });
      await StudentTarget.deleteMany({ student: student._id });
      await TeacherStudentMap.updateMany(
        { students: student._id },
        { $pull: { students: student._id } }
      );
      await User.findByIdAndDelete(student._id);
      await deleteFaceByUsername(student.username);
      deletedUsernames.push(student.username);
    };

    if (user.role === "teacher") {
      const map = await TeacherStudentMap.findOne({ teacher: user._id }).populate("students");
      const linkedStudents = map?.students || [];

      const teacherInternships = await Internship.find({ teacher: user._id }).select("_id");
      const internshipIds = teacherInternships.map((internship) => internship._id);

      await User.updateMany(
        {
          $or: [
            { assignedTeacher: user._id },
            { _id: { $in: linkedStudents.map((student) => student._id) } }
          ]
        },
        { $set: { assignedTeacher: null, teacherName: "" } }
      );

      if (linkedStudents.length > 0) {
        await TeacherStudentMap.updateMany(
          { students: { $in: linkedStudents.map((student) => student._id) } },
          { $pull: { students: { $in: linkedStudents.map((student) => student._id) } } }
        );
      }

      if (internshipIds.length > 0) {
        await InternshipStatus.deleteMany({ internship: { $in: internshipIds } });
      }

      await Internship.deleteMany({ teacher: user._id });
      await TeacherStudentMap.deleteMany({ teacher: user._id });
      await User.findByIdAndDelete(user._id);
      await deleteFaceByUsername(user.username);
      deletedUsernames.unshift(user.username);
    } else if (user.role === "student") {
      await deleteStudentData(user);
    } else {
      await User.findByIdAndDelete(user._id);
      deletedUsernames.push(user.username);
    }

    res.json({
      message: "User deleted",
      username: user.username,
      deletedUsers: deletedUsernames
    });
    writeAuditLog({
      req,
      action: "ADMIN_DELETE_USER",
      details: { deletedUsernames, deletedRole: user.role }
    });
  } catch (err) {
    writeAuditLog({ req, action: "ADMIN_DELETE_USER", status: "FAILED", details: { reason: err.message, userId: req.params.id } });
    res.status(500).json({ error: err.message });
  }
};
