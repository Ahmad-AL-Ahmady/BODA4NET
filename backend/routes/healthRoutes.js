import express from "express";
import { SERVER_CONFIG, HEALTH_CONFIG } from "../config/index.js";
import logger from "../middleware/logger.js";
import uquidService from "../services/uquidService.js";

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

export default router;
