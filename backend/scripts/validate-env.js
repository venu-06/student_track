import dotenv from "dotenv";

dotenv.config();

const required = [
  "PORT",
  "NODE_ENV",
  "MONGO_URI",
  "JWT_SECRET",
  "CORS_ORIGINS",
  "FACE_SERVICE_URL"
];

const optionalButRecommended = [
  "MAIL_USER",
  "MAIL_PASS",
  "PROVISION_ADMIN_USERNAME",
  "PROVISION_ADMIN_PASSWORD"
];

const missingRequired = required.filter((key) => !String(process.env[key] || "").trim());
const missingRecommended = optionalButRecommended.filter((key) => !String(process.env[key] || "").trim());

if (String(process.env.JWT_SECRET || "").trim().length < 32) {
  missingRequired.push("JWT_SECRET(min_length_32)");
}

if (missingRequired.length > 0) {
  console.error("Missing required environment values:");
  for (const item of missingRequired) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Required environment values are present.");

if (missingRecommended.length > 0) {
  console.warn("Recommended environment values are missing:");
  for (const item of missingRecommended) {
    console.warn(`- ${item}`);
  }
}

process.exit(0);
