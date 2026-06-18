import fs from "fs";
import path from "path";

const auditDir = path.join(process.cwd(), "logs");
const auditFile = path.join(auditDir, "audit.log");

const ensureAuditDir = () => {
  fs.mkdirSync(auditDir, { recursive: true });
};

export const writeAuditLog = ({ req, action, status = "SUCCESS", details = {} }) => {
  try {
    ensureAuditDir();
    const payload = {
      at: new Date().toISOString(),
      action,
      status,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userId: req.user?._id || null,
      username: req.user?.username || null,
      role: req.user?.role || null,
      details
    };
    fs.appendFileSync(auditFile, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};
