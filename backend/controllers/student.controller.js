import Attendance from "../models/Attendance.js";
import Internship from "../models/Internship.js";
import InternshipStatus from "../models/InternshipStatus.js";
import Achievement from "../models/Achievement.js";
import Permission from "../models/Permission.js";
import Certificate from "../models/Certificate.js";
import StudentTarget from "../models/StudentTarget.js";
import TeacherStudentMap from "../models/TeacherStudentMap.js";
import User from "../models/User.js";
import AttendanceSession from "../models/AttendanceSession.js";
import { writeAuditLog } from "../middleware/audit.js";
import { deleteCloudinaryFile, uploadFileToCloudinary } from "../utils/cloudinary.js";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import path from "path";

const getTodayDate = () => new Date().toISOString().split("T")[0];
const TARGET_STATUSES = new Set(["not_started", "ongoing", "completed"]);
const SUCCESSFUL_SUBMISSION_PATTERNS = [
  /applied successfully/i,
  /successfully applied/i,
  /application submitted/i,
  /submitted successfully/i,
  /submission successful/i,
  /application received/i,
  /you have applied/i,
  /you applied/i,
  /registered successfully/i,
  /registration successful/i,
  /successfully registered/i,
  /thank you for applying/i
];
const RESUME_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "of", "on", "or", "our", "that", "the", "this", "to", "with", "you", "your", "we", "will",
  "job", "role", "candidate", "position", "responsibilities", "requirements", "required", "preferred", "experience", "years", "work", "team", "ability", "strong", "good", "excellent",
  "resume", "curriculum", "vitae", "email", "phone", "address", "linkedin", "github", "project", "projects", "education", "summary", "objective"
]);
const KNOWN_RESUME_SKILLS = [
  "javascript", "typescript", "react", "node", "express", "mongodb", "mongoose", "sql", "mysql", "postgresql", "python", "java", "c++", "c#", "html", "css", "bootstrap", "tailwind",
  "rest api", "api", "git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "flask", "django", "spring boot", "machine learning", "deep learning", "opencv",
  "data analysis", "data structures", "algorithms", "oop", "authentication", "jwt", "bcrypt", "excel", "power bi", "tableau", "figma", "ui", "ux", "testing", "jest", "cypress",
  "communication", "problem solving", "leadership", "agile", "scrum", "cloud", "devops", "ci/cd", "firebase", "redux", "next.js", "vite"
];

const isInternshipExpired = (internship) => {
  if (!internship?.deadline) return false;
  const deadline = new Date(internship.deadline);
  deadline.setHours(23, 59, 59, 999);
  return Date.now() > deadline.getTime();
};

const markExpiredStatusAsNotApplied = async (status) => {
  if (!status || !isInternshipExpired(status.internship)) return status;
  if (!status.applied && !status.appliedAt && !status.applicationProof) return status;

  status.applied = false;
  status.appliedAt = null;
  status.applicationProof = "";
  status.shortlisted = "pending";
  status.proofVerificationStatus = "not_checked";
  status.proofVerificationReason = "Deadline expired";
  await status.save();
  return status;
};

const normalizeProofText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/https?:\/\/\s+/g, "https://")
    .replace(/\s+/g, " ")
    .trim();

const extractInternshipIdFromUrl = (url = "") => {
  const [cleanUrl] = String(url).split(/[?#]/);
  const match = cleanUrl.match(/(\d+)(?:\/)?$/);
  return match?.[1] || "";
};

const buildUrlFragments = (url = "") => {
  const normalizedUrl = String(url).trim().toLowerCase();
  if (!normalizedUrl) return [];

  const withoutProtocol = normalizedUrl.replace(/^https?:\/\//, "");
  const withoutWww = withoutProtocol.replace(/^www\./, "");
  return Array.from(new Set([normalizedUrl, withoutProtocol, withoutWww].filter(Boolean)));
};

const readImageText = async (filePath) => {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(filePath);
    return result?.data?.text || "";
  } finally {
    await worker.terminate();
  }
};

const verifyInternshipProof = async ({ internship, proofFile }) => {
  if (!proofFile?.path) {
    return {
      ok: false,
      status: "rejected",
      reason: "Screenshot proof is required",
      extractedText: "",
      matchedUrl: false,
      matchedId: false
    };
  }

  const extractedText = await readImageText(proofFile.path);
  const normalizedText = normalizeProofText(extractedText);
  const internshipId = extractInternshipIdFromUrl(internship?.url);
  const urlFragments = buildUrlFragments(internship?.url);
  const matchedUrl = urlFragments.some((fragment) => normalizedText.includes(fragment));
  const matchedId = Boolean(internshipId && normalizedText.includes(internshipId));
  const matchedSubmission = SUCCESSFUL_SUBMISSION_PATTERNS.some((pattern) => pattern.test(extractedText));

  if (!(matchedUrl || matchedId)) {
    return {
      ok: false,
      status: "rejected",
      reason: "Proof does not match this internship URL or ID",
      extractedText,
      matchedUrl,
      matchedId
    };
  }

  if (!matchedSubmission) {
    return {
      ok: false,
      status: "rejected",
      reason: "Proof does not show a successful submission message",
      extractedText,
      matchedUrl,
      matchedId
    };
  }

  return {
    ok: true,
    status: "verified",
    reason: "Proof verified",
    extractedText,
    matchedUrl,
    matchedId
  };
};

const normalizeResumeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeResumeText = (value = "") =>
  normalizeResumeText(value)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !RESUME_STOP_WORDS.has(word));

const phraseExists = (text, phrase) => normalizeResumeText(text).includes(normalizeResumeText(phrase));

const getTopTerms = (text, limit = 20) => {
  const counts = new Map();
  for (const token of tokenizeResumeText(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
};

const getRelevantKeywords = (jobDescription) => {
  const skillMatches = KNOWN_RESUME_SKILLS.filter((skill) => phraseExists(jobDescription, skill));
  const termMatches = getTopTerms(jobDescription, 24);
  return Array.from(new Set([...skillMatches, ...termMatches])).slice(0, 30);
};

const getOverlapScore = (jobKeywords, resumeText) => {
  if (jobKeywords.length === 0) return 0;
  const matched = jobKeywords.filter((keyword) => phraseExists(resumeText, keyword));
  return matched.length / jobKeywords.length;
};

const verifyResumeSuggestions = ({ jobKeywords, resumeText, suggestions }) => {
  const allowed = new Set(jobKeywords);
  const verifiedSuggestions = suggestions.filter((keyword) => allowed.has(keyword) && !phraseExists(resumeText, keyword));
  return {
    valid: verifiedSuggestions.length === suggestions.length && verifiedSuggestions.length > 0,
    checkedAt: new Date().toISOString(),
    verifiedSuggestions,
    reason: verifiedSuggestions.length > 0
      ? "Suggestions are present in the job description and weak or missing in the resume."
      : "No safe keyword suggestions could be verified for this resume and job description."
  };
};

const extractResumePdfText = async (file) => {
  if (!file) {
    throw new Error("Resume PDF is required");
  }

  if (path.extname(file.originalname || "").toLowerCase() !== ".pdf") {
    throw new Error("Resume must be uploaded as a PDF file");
  }

  const dataBuffer = fs.readFileSync(file.path);
  const parser = new PDFParse({ data: dataBuffer });
  try {
    const parsed = await parser.getText();
    return parsed?.text || "";
  } finally {
    await parser.destroy();
  }
};

export const checkResumeMatch = async (req, res) => {
  try {
    const jobDescription = String(req.body?.jobDescription || "").trim();
    const resume = await extractResumePdfText(req.file);

    if (jobDescription.length < 80 || resume.length < 80) {
      return res.status(400).json({ error: "Enter a proper job description and upload a readable resume PDF." });
    }

    const jobKeywords = getRelevantKeywords(jobDescription);
    const resumeTerms = getTopTerms(resume, 30);
    const overlapScore = getOverlapScore(jobKeywords, resume);
    const resumeToJobNoise = resumeTerms.filter((term) => !phraseExists(jobDescription, term)).slice(0, 12);

    if (jobKeywords.length < 6 || overlapScore < 0.08) {
      return res.json({
        status: "invalid_input",
        message: "Choose the correct job description or resume.",
        overlapScore,
        suggestions: [],
        missingKeywords: [],
        unrelatedResumeTerms: resumeToJobNoise,
        verification: {
          valid: false,
          checkedAt: new Date().toISOString(),
          reason: "The resume and job description do not appear related enough to generate reliable suggestions."
        }
      });
    }

    const missingKeywords = jobKeywords.filter((keyword) => !phraseExists(resume, keyword)).slice(0, 14);
    const alreadyPresentKeywords = jobKeywords.filter((keyword) => phraseExists(resume, keyword)).slice(0, 14);
    const suggestions = missingKeywords.slice(0, 10);
    const verification = verifyResumeSuggestions({ jobKeywords, resumeText: resume, suggestions });

    res.json({
      status: verification.valid ? "ok" : "review_needed",
      message: verification.valid
        ? "Resume suggestions generated and reverified."
        : "Choose the correct job description or resume.",
      overlapScore,
      suggestions,
      missingKeywords,
      alreadyPresentKeywords,
      unrelatedResumeTerms: resumeToJobNoise,
      verification
    });
  } catch (err) {
    const status = err.message.includes("required") || err.message.includes("PDF") ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
};

const getActiveAttendanceSessionForStudent = async (user) => {
  if (!user?.department || !user?.year) {
    return null;
  }

  return AttendanceSession.findOne({
    department: user.department,
    year: user.year,
    date: getTodayDate(),
    status: "active"
  }).populate("teacher", "name username department");
};

// ATTENDANCE & PERMISSIONS
export const markAttendance = async (req, res) => {
  try {
    const { status, purpose, location, faceImage } = req.body;
    const activeSession = await getActiveAttendanceSessionForStudent(req.user);
    if (!activeSession) {
      return res.status(403).json({ error: "Attendance is not active for your department and year right now." });
    }

    const today = getTodayDate();
    const existingAttendance = await Attendance.findOne({ student: req.user._id, date: today });
    if (existingAttendance) {
      return res.status(400).json({ error: "Attendance already marked for today." });
    }

    let data = {
      student: req.user._id,
      date: today,
      hour: new Date().getHours(),
      status,
      session: activeSession._id
    };

    if (status === "present") {
      data.location = location || "";
      data.faceImage = faceImage || ""; // This comes from successful face match
      data.permissionStatus = null;
    } else if (status === "absent") {
      data.purpose = purpose || "";
      data.permissionStatus = "pending";

      const teacherId = req.user.assignedTeacher || (await TeacherStudentMap.findOne({ students: req.user._id }))?.teacher;
      if (teacherId) {
        data.teacher = teacherId;
      }

      if (teacherId) {
        await Permission.create({
          student: req.user._id,
          teacher: teacherId,
          date: data.date,
          reason: purpose,
          imageProof: req.file ? `/uploads/${req.file.filename}` : "" // Optional uploaded image
        });
      }
    }

    const attendance = await Attendance.create(data);
    writeAuditLog({ req, action: "STUDENT_MARK_ATTENDANCE", details: { status, date: data.date, sessionId: activeSession._id.toString() } });
    res.json({ message: `Attendance marked as ${status}`, attendance });
  } catch (err) {
    writeAuditLog({ req, action: "STUDENT_MARK_ATTENDANCE", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceSessionStatus = async (req, res) => {
  try {
    const session = await getActiveAttendanceSessionForStudent(req.user);
    res.json({
      active: Boolean(session),
      session: session ? {
        _id: session._id,
        department: session.department,
        year: session.year,
        date: session.date,
        startedAt: session.startedAt,
        teacher: session.teacher || null
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const viewAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ student: req.user._id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const all = await Attendance.find({ student: req.user._id });
    const present = all.filter(a => a.status === "present").length;
    const absent = all.filter(a => a.status === "absent").length;
    res.json({ total: all.length, present, absent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// INTERNSHIPS
export const viewInternships = async (req, res) => {
  try {
    const statuses = await InternshipStatus.find({ student: req.user._id })
      .populate({
        path: "internship",
        populate: { path: "teacher", select: "name email" }
      });

    for (const status of statuses) {
      await markExpiredStatusAsNotApplied(status);
    }

    res.json(statuses.map((status) => status.internship).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const applyInternship = async (req, res) => {
  try {
    const { internshipId } = req.body;
    const proofImage = req.file ? `/uploads/${req.file.filename}` : "";

    const status = await InternshipStatus.findOne({
      internship: internshipId,
      student: req.user._id
    }).populate("internship");

    if (!status) return res.status(404).json({ error: "Internship not found or not mapped" });

    if (isInternshipExpired(status.internship)) {
      await markExpiredStatusAsNotApplied(status);
      return res.status(400).json({ error: "The internship deadline is over. Application status is Not Applied." });
    }

    let verification;
    try {
      verification = await verifyInternshipProof({ internship: status.internship, proofFile: req.file });
    } catch (error) {
      status.applied = false;
      status.appliedAt = null;
      status.applicationProof = proofImage;
      status.proofVerificationStatus = "error";
      status.proofVerificationReason = "Could not read screenshot proof";
      status.proofCheckedAt = new Date();
      await status.save();
      return res.status(400).json({ error: "Could not read screenshot proof. Please upload a clearer image." });
    }

    status.applicationProof = proofImage;
    status.proofVerificationStatus = verification.status;
    status.proofVerificationReason = verification.reason;
    status.proofExtractedText = verification.extractedText.slice(0, 5000);
    status.proofMatchedUrl = verification.matchedUrl;
    status.proofMatchedId = verification.matchedId;
    status.proofCheckedAt = new Date();

    if (!verification.ok) {
      status.applied = false;
      status.appliedAt = null;
      status.shortlisted = "pending";
      await status.save();
      return res.status(400).json({ error: "Proof could not be verified. Upload the actual successful submission screenshot." });
    }

    status.applied = true;
    status.appliedAt = new Date();
    await status.save();

    res.json({ message: "Application proof verified and submitted", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateInternshipAction = async (req, res) => {
  try {
    // Allows student to specify if they were shortlisted or not
    const { internshipId, shortlistedStatus } = req.body;
    const status = await InternshipStatus.findOne({ internship: internshipId, student: req.user._id });
    if (!status) return res.status(404).json({ error: "Application not found" });

    status.shortlisted = shortlistedStatus; // "shortlisted", "not_shortlisted", "pending"
    await status.save();
    res.json({ message: "Status updated", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const withdrawInternship = async (req, res) => {
  try {
    const { internshipId } = req.body;
    const status = await InternshipStatus.findOne({ internship: internshipId, student: req.user._id });
    if (!status) return res.status(404).json({ error: "Application not found" });

    status.applied = false;
    status.appliedAt = null;
    status.applicationProof = "";
    status.proofVerificationStatus = "not_checked";
    status.proofVerificationReason = "";
    status.proofExtractedText = "";
    status.proofMatchedUrl = false;
    status.proofMatchedId = false;
    status.proofCheckedAt = null;
    status.shortlisted = "pending";
    await status.save();
    res.json({ message: "Application withdrawn", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyInternshipStatus = async (req, res) => {
  try {
    const statuses = await InternshipStatus.find({ student: req.user._id }).populate("internship");
    for (const status of statuses) {
      await markExpiredStatusAsNotApplied(status);
    }
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyTargets = async (req, res) => {
  try {
    const targets = await StudentTarget.find({ student: req.user._id })
      .populate("teacher", "name")
      .sort({ createdAt: -1 });

    res.json(targets.map((target) => ({
      _id: target._id,
      targetGroupId: target.targetGroupId || target._id,
      title: target.title || target.target || "Untitled target",
      status: target.status || "not_started",
      completedAt: target.completedAt || null,
      createdAt: target.createdAt,
      teacher: target.teacher
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMyTargetStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!TARGET_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid target status" });
    }

    const target = await StudentTarget.findOne({ _id: req.params.id, student: req.user._id });
    if (!target) {
      return res.status(404).json({ error: "Target not found" });
    }

    target.status = status;
    target.completedAt = status === "completed" ? new Date() : null;
    await target.save();

    res.json({
      message: "Target status updated",
      target: {
        _id: target._id,
        targetGroupId: target.targetGroupId || target._id,
        title: target.title || target.target || "Untitled target",
        status: target.status,
        completedAt: target.completedAt,
        createdAt: target.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ACHIEVEMENTS
export const getMyAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({ student: req.user._id }).populate("teacher", "name").sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addAchievement = async (req, res) => {
  try {
    const { title, description, shareWithTeacher } = req.body;
    const teacherId = req.user.assignedTeacher || (await TeacherStudentMap.findOne({ students: req.user._id }))?.teacher;

    const achievement = await Achievement.create({
      student: req.user._id,
      teacher: teacherId || null,
      title,
      description,
      shared: shareWithTeacher === true || shareWithTeacher === "true",
      sharedAt: shareWithTeacher ? new Date() : null
    });
    res.json({ message: "Achievement added", achievement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const shareAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.assignedTeacher || (await TeacherStudentMap.findOne({ students: req.user._id }))?.teacher;
    if (!teacherId) return res.status(404).json({ error: "No teacher assigned" });

    const achievement = await Achievement.findOne({ _id: id, student: req.user._id });
    if (!achievement) return res.status(404).json({ error: "Not found" });

    achievement.shared = true;
    achievement.sharedAt = new Date();
    achievement.teacher = teacherId;
    await achievement.save();
    res.json({ message: "Achievement shared", achievement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CERTIFICATES
export const uploadCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File required" });
    const purpose = (req.body.purpose || "").trim();

    // Check limit
    const count = await Certificate.countDocuments({ student: req.user._id });
    if (count >= 20) return res.status(400).json({ error: "Certificate limit reached (Max 20)" });

    const cloudinaryFile = await uploadFileToCloudinary(req.file.path, {
      folder: "student_track/certificates",
      resourceType: "auto"
    });

    const cert = await Certificate.create({
      student: req.user._id,
      title: purpose || req.body.title || req.file.originalname,
      purpose,
      fileName: cloudinaryFile?.url || `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      storageProvider: cloudinaryFile ? "cloudinary" : "local",
      cloudinaryPublicId: cloudinaryFile?.publicId || "",
      cloudinaryResourceType: cloudinaryFile?.resourceType || ""
    });

    if (cloudinaryFile && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    writeAuditLog({ req, action: "STUDENT_UPLOAD_CERTIFICATE", details: { fileName: req.file.originalname, purpose } });
    res.json({ message: "Certificate uploaded", certificate: cert });
  } catch (err) {
    writeAuditLog({ req, action: "STUDENT_UPLOAD_CERTIFICATE", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};

export const getCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findOne({ _id: req.params.id, student: req.user._id });
    if (!cert) return res.status(404).json({ error: "Document not found" });

    if (cert.cloudinaryPublicId) {
      await deleteCloudinaryFile(cert.cloudinaryPublicId, cert.cloudinaryResourceType || "image");
    } else if (cert.fileName && !/^https?:\/\//i.test(cert.fileName)) {
      const relativePath = cert.fileName.replace(/^\/+/, "").replace(/\//g, path.sep);
      const filePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await cert.deleteOne();
    writeAuditLog({ req, action: "STUDENT_DELETE_CERTIFICATE", details: { certificateId: cert._id.toString(), fileName: cert.originalName } });
    res.json({ message: "Document deleted" });
  } catch (err) {
    writeAuditLog({ req, action: "STUDENT_DELETE_CERTIFICATE", status: "FAILED", details: { reason: err.message } });
    res.status(500).json({ error: err.message });
  }
};

export const getMyTeacher = async (req, res) => {
  try {
    if (req.user.assignedTeacher) {
      const teacher = await User.findById(req.user.assignedTeacher).select("name email department username");
      return res.json(teacher || null);
    }

    const map = await TeacherStudentMap.findOne({ students: req.user._id }).populate("teacher", "name email department username");
    res.json(map?.teacher || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
