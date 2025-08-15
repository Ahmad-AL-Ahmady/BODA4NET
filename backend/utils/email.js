/**
 * email.js
 *
 * Email utility for sending emails using Nodemailer
 * Configured for Gmail SMTP but can be easily changed for other providers
 */

import nodemailer from "nodemailer";
import { EMAIL_CONFIG } from "../config/index.js";

// Create transporter
const createTransporter = () => {
  // Check if email configuration is complete
  if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
    throw new Error(
      "Email configuration is incomplete. Please set EMAIL_USER and EMAIL_PASS environment variables."
    );
  }

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.HOST,
    port: EMAIL_CONFIG.PORT,
    secure: EMAIL_CONFIG.PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_CONFIG.USER,
      pass: EMAIL_CONFIG.PASS,
    },
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    // Create transporter
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: EMAIL_CONFIG.FROM,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ [EMAIL] Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ [EMAIL] Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

export default sendEmail;
