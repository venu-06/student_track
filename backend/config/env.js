const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return String(value).trim().toLowerCase() === "true";
};

export const isProduction = process.env.NODE_ENV === "production";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }
  return secret;
};

export const getAllowedOrigins = () => {
  const configured = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set(configured));
};

export const shouldSetupDefaultAdmin = () => {
  if (!isProduction) return true;
  return normalizeBoolean(process.env.ALLOW_DEFAULT_ADMIN, false);
};
