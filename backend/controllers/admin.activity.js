import ReportModel from "../models/Report.js";
import User from "../models/User.js";
import { deleteCloudinaryFile } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

export const getReports = async (req, res) => {
    try {
        const reports = await ReportModel.find().populate("teacher", "name username");
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getTeacherActivities = async (req, res) => {
    try {
        // Basic teacher activity could be their recent login, models updated, etc.
        const teachers = await User.find({ role: "teacher" }).select("name username loginCount lastLogin");
        // As per requirement we just need Teacher status details to view. We can just append loginCount
        res.json(teachers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const report = await ReportModel.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        if (report.cloudinaryPublicId) {
            try {
                await deleteCloudinaryFile(report.cloudinaryPublicId, report.cloudinaryResourceType || "raw");
            } catch (cloudinaryErr) {
                console.error("Error deleting report file from Cloudinary:", cloudinaryErr);
            }
        } else if (report.content && !/^https?:\/\//i.test(report.content)) {
            try {
                const relativePath = report.content.startsWith('/') ? report.content.substring(1) : report.content;
                const absolutePath = path.join(process.cwd(), relativePath);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                }
            } catch (fsErr) {
                console.error("Error deleting report file from filesystem:", fsErr);
            }
        }
        await ReportModel.findByIdAndDelete(req.params.id);
        res.json({ message: "Report deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
