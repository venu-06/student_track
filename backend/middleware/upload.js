import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const safeName = (name = "file") => name.replace(/[^A-Za-z0-9._-]/g, "_");

const buildDiskStorage = (subfolder = "") =>
  multer.diskStorage({
    destination(req, file, cb) {
      const destination = path.join(uploadsRoot, subfolder);
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${safeName(file.originalname)}`);
    }
  });

const buildUploader = ({ subfolder = "", maxSizeBytes, allowedExtensions, allowedMimeTypes }) =>
  multer({
    storage: buildDiskStorage(subfolder),
    limits: { fileSize: maxSizeBytes },
    fileFilter(req, file, cb) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      if (allowedExtensions && !allowedExtensions.includes(extension)) {
        return cb(new Error("Invalid file extension"));
      }
      if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Invalid file type"));
      }
      return cb(null, true);
    }
  });

export const excelUpload = buildUploader({
  maxSizeBytes: Number(process.env.MAX_EXCEL_UPLOAD_BYTES || 5 * 1024 * 1024),
  allowedExtensions: [".xlsx", ".xls"],
  allowedMimeTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream"
  ]
});

export const imageUpload = buildUploader({
  maxSizeBytes: Number(process.env.MAX_IMAGE_UPLOAD_BYTES || 3 * 1024 * 1024),
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
});

export const documentUpload = buildUploader({
  maxSizeBytes: Number(process.env.MAX_DOCUMENT_UPLOAD_BYTES || 8 * 1024 * 1024),
  allowedExtensions: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png"
  ]
});
