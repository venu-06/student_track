import Attendance from "../models/Attendance.js";
import Internship from "../models/Internship.js";
import InternshipStatus from "../models/InternshipStatus.js";
import Achievement from "../models/Achievement.js";
import ReportModel from "../models/Report.js";
import TeacherStudentMap from "../models/TeacherStudentMap.js";
import Permission from "../models/Permission.js";
import StudentTarget from "../models/StudentTarget.js";
import User from "../models/User.js";
import AttendanceSession from "../models/AttendanceSession.js";
import { writeAuditLog } from "../middleware/audit.js";
import mongoose from "mongoose";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";

const getAssignedStudents = async (teacherId) => {
  const directStudents = await User.find({ role: "student", assignedTeacher: teacherId }).select("_id username name department year");
  const map = await TeacherStudentMap.findOne({ teacher: teacherId }).populate("students", "_id username name department year teacherName assignedTeacher");

  const byId = new Map();
  for (const student of directStudents) {
    byId.set(student._id.toString(), student);
  }
  for (const student of map?.students || []) {
    byId.set(student._id.toString(), student);
  }

  return Array.from(byId.values());
};

const getGroupFilter = (source = {}) => ({
  department: String(source.department || "").trim(),
  year: String(source.year || "").trim()
});

const hasGroupFilter = (filter = {}) => Boolean(filter.department || filter.year);

const applyGroupFilter = (students, filter = {}) => {
  const { department, year } = getGroupFilter(filter);
  return students.filter((student) => (
    (!department || student.department === department) &&
    (!year || student.year === year)
  ));
};

const getFilteredAssignedStudents = async (teacherId, filter = {}) => {
  const students = await getAssignedStudents(teacherId);
  return applyGroupFilter(students, filter);
};

const getFilteredStudentIds = async (teacherId, filter = {}) => (
  await getFilteredAssignedStudents(teacherId, filter)
).map((student) => student._id);

const getTodayDate = () => new Date().toISOString().split("T")[0];

const normalizeTargetText = (value = "") => value.replace(/^\s*([-*•]|\d+\.)\s*/, "").trim();

const parseTargetItems = (body = {}) => {
  if (Array.isArray(body.targets)) {
    return body.targets.map((item) => normalizeTargetText(item)).filter(Boolean);
  }

  return String(body.target || "")
    .split(/\r?\n/)
    .map((item) => normalizeTargetText(item))
    .filter(Boolean);
};

// INTERNSHIPS
export const postInternship = async (req, res) => {
  try {
    const { department, year } = getGroupFilter(req.body);
    if (!department || !year) {
      return res.status(400).json({ error: "Department and year are required" });
    }

    const internship = await Internship.create({
      title: req.body.title,
      url: req.body.url,
      deadline: req.body.deadline || null,
      department,
      year,
      teacher: req.user._id
    });

    const students = await getFilteredAssignedStudents(req.user._id, { department, year });
    if (students.length > 0) {
      for (let s of students) {
        await InternshipStatus.create({
          internship: internship._id,
          student: s._id
        });
      }
    }
    res.json({ message: "Internship posted", internship });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInternships = async (req, res) => {
  try {
    const { department, year } = getGroupFilter(req.query);
    const filter = { teacher: req.user._id };
    if (department) filter.department = department;
    if (year) filter.year = year;
    const internships = await Internship.find(filter).populate("teacher", "name email").sort({ createdAt: -1 });
    res.json(internships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInternshipStats = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const groupFilter = getGroupFilter(req.query);
    const studentIds = await getFilteredStudentIds(req.user._id, groupFilter);
    const filter = { internship: internshipId };
    if (hasGroupFilter(groupFilter) && studentIds.length === 0) {
      return res.json({ total: 0, appliedCount: 0, notAppliedCount: 0, applied: [], notApplied: [] });
    }
    if (studentIds.length > 0) filter.student = { $in: studentIds };
    const statuses = await InternshipStatus.find(filter).populate("student", "username name department year");
    const applied = statuses.filter(s => s.applied);
    const notApplied = statuses.filter(s => !s.applied);
    res.json({ total: statuses.length, appliedCount: applied.length, notAppliedCount: notApplied.length, applied, notApplied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// TARGETS
export const postTarget = async (req, res) => {
  try {
    const { department, year } = getGroupFilter(req.body);
    if (!department || !year) {
      return res.status(400).json({ error: "Department and year are required" });
    }

    const targetItems = [...new Set(parseTargetItems(req.body))];
    if (targetItems.length === 0) {
      return res.status(400).json({ error: "At least one target is required" });
    }

    const students = await getFilteredAssignedStudents(req.user._id, { department, year });
    if (students.length > 0) {
      const targetDocuments = [];

      for (const targetItem of targetItems) {
        const targetGroupId = new mongoose.Types.ObjectId();

        for (const student of students) {
          targetDocuments.push({
            teacher: req.user._id,
            student: student._id,
            targetGroupId,
            title: targetItem,
            target: targetItem,
            status: "not_started"
          });
        }
      }

      await StudentTarget.insertMany(targetDocuments);
    }

    res.json({ message: "Targets posted to students", count: targetItems.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTargetStats = async (req, res) => {
  try {
    const groupFilter = getGroupFilter(req.query);
    const studentIds = await getFilteredStudentIds(req.user._id, groupFilter);
    const filter = { teacher: req.user._id };
    if (hasGroupFilter(groupFilter) && studentIds.length === 0) {
      return res.json([]);
    }
    if (studentIds.length > 0) filter.student = { $in: studentIds };

    const targetEntries = await StudentTarget.find(filter)
      .populate("student", "username name department year")
      .sort({ createdAt: -1 });

    const groupedTargets = new Map();

    for (const entry of targetEntries) {
      const groupId = entry.targetGroupId?.toString() || entry._id.toString();
      const title = entry.title || entry.target || "Untitled target";

      if (!groupedTargets.has(groupId)) {
        groupedTargets.set(groupId, {
          _id: groupId,
          title,
          createdAt: entry.createdAt,
          totalStudents: 0,
          completedCount: 0,
          ongoingCount: 0,
          notStartedCount: 0,
          students: []
        });
      }

      const currentGroup = groupedTargets.get(groupId);
      currentGroup.totalStudents += 1;

      if (entry.status === "completed") {
        currentGroup.completedCount += 1;
      } else if (entry.status === "ongoing") {
        currentGroup.ongoingCount += 1;
      } else {
        currentGroup.notStartedCount += 1;
      }

      currentGroup.students.push({
        _id: entry._id,
        status: entry.status || "not_started",
        student: entry.student
      });
    }

    const stats = Array.from(groupedTargets.values())
      .map((item) => {
        const total = item.totalStudents || 1;
        return {
          ...item,
          completedPercentage: Math.round((item.completedCount / total) * 100),
          ongoingPercentage: Math.round((item.ongoingCount / total) * 100),
          notStartedPercentage: Math.round((item.notStartedCount / total) * 100)
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ATTENDANCE & PERMISSIONS
export const viewAttendance = async (req, res) => {
  try {
    const students = await getFilteredAssignedStudents(req.user._id, req.query);
    const studentsArray = students.map((student) => student._id);
    const attendance = await Attendance.find({
      student: { $in: studentsArray },
      status: "absent"
    }).populate("student", "username name");
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStudentAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceStatistics = async (req, res) => {
  try {
    const students = await getFilteredAssignedStudents(req.user._id, req.query);
    const studentIds = students.map((student) => student._id);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const stats = await Attendance.aggregate([
      { $match: { student: { $in: studentIds } } },
      {
        $group: {
          _id: "$student",
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const statsByStudentId = new Map(
      stats.map((item) => [item._id.toString(), item])
    );

    const rows = students
      .map((student) => {
        const matched = statsByStudentId.get(student._id.toString());
        const total = matched?.total || 0;
        const present = matched?.present || 0;
        const absent = matched?.absent || 0;
        const percentage = total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

        return {
          _id: student._id,
          username: student.username,
          name: student.name,
          department: student.department || "",
          year: student.year || "",
          total,
          present,
          absent,
          percentage
        };
      })
      .sort((a, b) => b.percentage - a.percentage || a.username.localeCompare(b.username));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const groupFilter = getGroupFilter(req.query);
    const studentIds = await getFilteredStudentIds(req.user._id, groupFilter);
    const filter = { teacher: req.user._id };
    if (hasGroupFilter(groupFilter) && studentIds.length === 0) {
      return res.json([]);
    }
    if (studentIds.length > 0) filter.student = { $in: studentIds };
    const permissions = await Permission.find(filter).populate("student", "username name department year");
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const grantPermission = async (req, res) => {
  try {
    const { permissionId, status } = req.body; // status: granted or denied
    const permission = await Permission.findByIdAndUpdate(permissionId, { status }, { new: true });

    // Update Attendance record here to reflect the granted/denied status
    if (permission) {
      await Attendance.findOneAndUpdate(
        { student: permission.student, date: permission.date, status: "absent" },
        { permissionStatus: status }
      );
    }

    res.json({ message: `Permission ${status}`, permission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ACHIEVEMENTS
export const addAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.create({
      student: req.body.studentId,
      teacher: req.user._id,
      title: req.body.title,
      description: req.body.description
    });
    res.json({ message: "Achievement added", achievement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStudentAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({ student: req.params.studentId }).populate("teacher", "name");
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAchievement = async (req, res) => {
  try {
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ message: "Achievement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// REPORTS & EXCEL GENERATION
export const sendReport = async (req, res) => {
  try {
    const { internshipIds } = req.body; // array of IDs
    const { department, year } = getGroupFilter(req.body);
    if (!department || !year) {
      return res.status(400).json({ error: "Department and year are required" });
    }

    const students = await getFilteredAssignedStudents(req.user._id, { department, year });
    if (students.length === 0) return res.status(400).json({ error: "No students" });

    const internships = await Internship.find({ _id: { $in: internshipIds } });
    const statuses = await InternshipStatus.find({ internship: { $in: internshipIds } }).populate("student", "username");

    // Build Data Table
    const data = [];
    for (let s of students) {
      const row = { "studentrollno": s.username };
      for (let i of internships) {
        const matchingStatus = statuses.find(st => st.student._id.toString() === s._id.toString() && st.internship.toString() === i._id.toString());
        row[i.title] = matchingStatus && matchingStatus.applied ? "yes" : "no";
      }
      data.push(row);
    }

    // Generate Excel
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, "Report");

    const uploadsDir = path.join(process.cwd(), "uploads", "reports");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `Report_${req.user._id}_${Date.now()}.xlsx`;
    const filepath = path.join(uploadsDir, filename);
    xlsx.writeFile(wb, filepath);

    const report = await ReportModel.create({
      teacher: req.user._id,
      content: `/uploads/reports/${filename}`
    });

    res.json({ message: "Report generated and sent to admin", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyStudents = async (req, res) => {
  try {
    const students = await getAssignedStudents(req.user._id);
    const filteredStudents = applyGroupFilter(students, req.query);
    const enriched = await User.find({ _id: { $in: filteredStudents.map((student) => student._id) } })
      .select("-password")
      .sort({ username: 1 });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceSessions = async (req, res) => {
  try {
    const sessions = await AttendanceSession.find({ teacher: req.user._id })
      .sort({ startedAt: -1 })
      .limit(10);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceFilters = async (req, res) => {
  try {
    const students = await getAssignedStudents(req.user._id);
    const studentIds = students.map((student) => student._id);
    const enrichedStudents = await User.find({ _id: { $in: studentIds }, role: "student" })
      .select("department year")
      .lean();

    const departments = Array.from(
      new Set(enrichedStudents.map((student) => student.department).filter(Boolean))
    ).sort();

    const yearsByDepartment = departments.reduce((acc, department) => {
      acc[department] = Array.from(
        new Set(
          enrichedStudents
            .filter((student) => student.department === department)
            .map((student) => student.year)
            .filter(Boolean)
        )
      ).sort((a, b) => Number(a) - Number(b));
      return acc;
    }, {});

    res.json({ departments, yearsByDepartment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const startAttendanceSession = async (req, res) => {
  try {
    const department = (req.body.department || "").trim();
    const year = (req.body.year || "").trim();

    if (!department || !year) {
      return res.status(400).json({ error: "Department and year are required" });
    }

    const eligibleStudents = await User.countDocuments({
      role: "student",
      department,
      year
    });

    if (eligibleStudents === 0) {
      return res.status(400).json({ error: "No students found for the selected department and year" });
    }

    const existingSession = await AttendanceSession.findOne({
      department,
      year,
      date: getTodayDate(),
      status: "active"
    });

    if (existingSession) {
      return res.status(400).json({ error: "Attendance session is already active for this department and year" });
    }

    const session = await AttendanceSession.create({
      teacher: req.user._id,
      department,
      year,
      date: getTodayDate()
    });

    writeAuditLog({ req, action: "TEACHER_START_ATTENDANCE_SESSION", details: { department, year, sessionId: session._id.toString() } });
    res.json({ message: "Attendance session started", session });
  } catch (err) {
    writeAuditLog({ req, action: "TEACHER_START_ATTENDANCE_SESSION", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};

export const endAttendanceSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      teacher: req.user._id,
      status: "active"
    });

    if (!session) {
      return res.status(404).json({ error: "Active attendance session not found" });
    }

    session.status = "closed";
    session.endedAt = new Date();
    await session.save();

    writeAuditLog({ req, action: "TEACHER_END_ATTENDANCE_SESSION", details: { sessionId: session._id.toString() } });
    res.json({ message: "Attendance session ended", session });
  } catch (err) {
    writeAuditLog({ req, action: "TEACHER_END_ATTENDANCE_SESSION", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};
