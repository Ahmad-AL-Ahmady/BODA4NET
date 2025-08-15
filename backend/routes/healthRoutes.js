import express from "express";
import { SERVER_CONFIG, HEALTH_CONFIG, EMAIL_CONFIG } from "../config/index.js";
import logger from "../middleware/logger.js";
import uquidService from "../services/uquidService.js";
import sendEmail from "../utils/email.js";

const router = express.Router();

// Health check with comprehensive status
router.get("/", async (req, res) => {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: SERVER_CONFIG.NODE_ENV,
    memory: process.memoryUsage(),
    version: HEALTH_CONFIG.VERSION,
    services: {
      uquid: false,
    },
  };

  // Check external services
  try {
    // Test Uquid API
    healthData.services.uquid = await uquidService.isHealthy();
  } catch (error) {
    logger.warn("Uquid health check failed:", error.message);
  }

  // Sha7nawy service removed

  const allServicesHealthy = Object.values(healthData.services).every(Boolean);
  if (!allServicesHealthy) {
    healthData.status = "degraded";
  }

  res.status(allServicesHealthy ? 200 : 503).json(healthData);
});

// Email configuration test endpoint
router.get("/email-test", async (req, res) => {
  try {
    // Check if email configuration is complete
    if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
      return res.status(400).json({
        status: "error",
        message: "Email configuration is incomplete",
        config: {
          host: EMAIL_CONFIG.HOST,
          port: EMAIL_CONFIG.PORT,
          user: EMAIL_CONFIG.USER ? "SET" : "NOT_SET",
          pass: EMAIL_CONFIG.PASS ? "SET" : "NOT_SET",
          from: EMAIL_CONFIG.FROM,
        },
      });
    }

    // Test email sending (only in development)
    if (SERVER_CONFIG.NODE_ENV === "development") {
      try {
        await sendEmail({
          email: EMAIL_CONFIG.USER, // Send to self for testing
          subject: "BODA 4 NET - Email Configuration Test",
          message:
            "This is a test email to verify email configuration is working correctly.",
        });

        res.json({
          status: "success",
          message: "Email configuration is working correctly",
          config: {
            host: EMAIL_CONFIG.HOST,
            port: EMAIL_CONFIG.PORT,
            user: EMAIL_CONFIG.USER,
            from: EMAIL_CONFIG.FROM,
          },
        });
      } catch (emailError) {
        res.status(500).json({
          status: "error",
          message: "Email sending failed",
          error: emailError.message,
          config: {
            host: EMAIL_CONFIG.HOST,
            port: EMAIL_CONFIG.PORT,
            user: EMAIL_CONFIG.USER,
            from: EMAIL_CONFIG.FROM,
          },
        });
      }
    } else {
      res.json({
        status: "success",
        message:
          "Email configuration appears correct (test disabled in production)",
        config: {
          host: EMAIL_CONFIG.HOST,
          port: EMAIL_CONFIG.PORT,
          user: EMAIL_CONFIG.USER ? "SET" : "NOT_SET",
          from: EMAIL_CONFIG.FROM,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Email configuration test failed",
      error: error.message,
    });
  }
});

export default router;
