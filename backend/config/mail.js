import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

export const isMailConfigured = Boolean(mailUser && mailPass);

const buildTransportOptions = () => {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: mailUser,
        pass: mailPass
      }
    };
  }

  return {
    service: process.env.MAIL_SERVICE || "gmail",
    auth: {
      user: mailUser,
      pass: mailPass
    }
  };
};

export const transporter = isMailConfigured ? nodemailer.createTransport(buildTransportOptions()) : null;

export const getMailFrom = () => process.env.MAIL_FROM || mailUser;
