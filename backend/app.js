import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import morgan from "morgan";
import cors from "cors";

import {
  securityHeaders,
  createRateLimit,
  speedLimiter,
  validateApiKeys,
} from "./middleware/security.js";
import { requestLogger } from "./middleware/logger.js";
import {
  SERVER_CONFIG,
  RATE_LIMIT_CONFIG,
  VALIDATION_CONFIG,
  CORS_CONFIG,
} from "./config/index.js";

// Import route modules
import paymentRoutes from "./routes/paymentRoutes.js";
import kashierRoutes from "./routes/kashierRoutes.js";
import vodafoneRoutes from "./routes/vodafoneRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set("trust proxy", SERVER_CONFIG.TRUST_PROXY);

  // CORS configuration - Allow frontend to access the API
  app.use(
    cors({
      origin: [
        "http://localhost:5173", // Vite dev server
        "http://localhost:3000", // React dev server
        "http://localhost:3001", // Same origin
        "https://www.boda4net.com", // Add your production domain here
        "https://www.boda4net.com", // Add your production domain here
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // Global Middleware
  app.use(compression()); // Gzip compression

  // Security headers
  app.use(securityHeaders);

  // Morgan HTTP request logging
  app.use(
    morgan("🌐 :method :url :status :res[content-length] - :response-time ms", {
      immediate: false,
      stream: process.stdout,
    })
  );

  app.use(requestLogger); // Request logging

  app.use(express.json({ limit: VALIDATION_CONFIG.JSON_LIMIT }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: VALIDATION_CONFIG.URL_ENCODED_LIMIT,
    })
  );

  // Rate limiting
  app.use(
    "/api/",
    createRateLimit(RATE_LIMIT_CONFIG.WINDOW_MS, RATE_LIMIT_CONFIG.MAX_REQUESTS)
  );
  app.use("/api/", speedLimiter);

  // API key validation
  app.use("/api/", validateApiKeys);

  // Serve static files
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // Handle favicon requests to prevent 404 errors
  app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
  });

  // API Routes
  app.use("/api/payment", paymentRoutes);
  app.use("/api/kashier", kashierRoutes);
  app.use("/api/vodafone", vodafoneRoutes);
  app.use("/api/account", vodafoneRoutes); // Account balance route is in vodafone routes
  app.use("/api/uquid", vodafoneRoutes); // Uquid-specific routes are in vodafone routes
  app.use("/api/health", healthRoutes);

  // Serve React app for all other routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
  });

  return app;
}

export default createApp;
