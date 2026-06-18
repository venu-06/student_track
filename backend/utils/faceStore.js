import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const FACE_DB_PATH = path.join(ROOT_DIR, "face_recognition", "face_attendance.db");
const REGISTERED_FACES_DIR = path.join(ROOT_DIR, "face_recognition", "registered_faces");

const sanitizeUsername = (username = "") =>
  String(username)
    .split("")
    .filter((ch) => /[A-Za-z0-9_-]/.test(ch))
    .join("")
    .trim();

export const deleteFaceByUsername = async (username) => {
  if (!username) return { deletedDb: false, deletedFile: false };

  let deletedDb = false;
  let deletedFile = false;

  const db = new DatabaseSync(FACE_DB_PATH);
  try {
    const deleteAttendance = db.prepare("DELETE FROM Attendance WHERE username = ?");
    const deleteUser = db.prepare("DELETE FROM Users WHERE username = ?");

    deleteAttendance.run(username);
    const result = deleteUser.run(username);
    deletedDb = (result?.changes || 0) > 0;
  } finally {
    db.close();
  }

  const safeUsername = sanitizeUsername(username);
  if (safeUsername) {
    const facePath = path.join(REGISTERED_FACES_DIR, `${safeUsername}.jpg`);
    if (fs.existsSync(facePath)) {
      fs.unlinkSync(facePath);
      deletedFile = true;
    }
  }

  return { deletedDb, deletedFile };
};
