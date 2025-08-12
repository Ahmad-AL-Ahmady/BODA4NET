import createApp from "./app.js";
import logger from "./middleware/logger.js";
import {
  SERVER_CONFIG,
  UQUID_CONFIG,
  KASHIER_CONFIG,
  validateEnvironment,
} from "./config/index.js";

// Validate environment variables
const missingVars = validateEnvironment();

// Create Express application
const app = createApp();

// Global error handling middleware
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(7);

  logger.error(`[ERROR-${errorId}] Unhandled server error:`, {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? "REDACTED" : undefined,
    },
  });

  // Don't leak error details in production
  const message =
    SERVER_CONFIG.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
    errorId,
    timestamp: new Date().toISOString(),
    ...(SERVER_CONFIG.NODE_ENV !== "production" && {
      stack: err.stack,
      details: {
        url: req.url,
        method: req.method,
      },
    }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      logger.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
    logger.info("Server closed successfully");
    process.exit(0);
  });
};

// Start server
const server = app.listen(SERVER_CONFIG.PORT, "0.0.0.0", () => {
  console.log(`🚀 [SERVER] === APPLICATION STARTUP COMPLETED ===`);
  console.log(
    `🌐 [SERVER] Running on port ${SERVER_CONFIG.PORT} in ${SERVER_CONFIG.NODE_ENV} mode`
  );
  console.log(
    `🔑 [UQUID] API Key: ${UQUID_CONFIG.API_KEY ? "✅ Loaded" : "❌ Missing"}`
  );
  console.log(
    `💳 [KASHIER] Payment API Key: ${
      KASHIER_CONFIG.API_KEY ? "✅ Loaded" : "❌ Missing"
    }`
  );
  console.log(
    `🔐 [KASHIER] Secret Key: ${
      KASHIER_CONFIG.API_SECRET ? "✅ Loaded" : "❌ Missing"
    }`
  );
  console.log(
    `🏪 [KASHIER] Merchant ID: ${
      KASHIER_CONFIG.MERCHANT_ID ? "✅ Loaded" : "❌ Missing"
    }`
  );
  console.log(`🌍 [KASHIER] Mode: ${KASHIER_CONFIG.MODE}`);

  if (SERVER_CONFIG.NODE_ENV === "production") {
    console.log(`⚡ [SERVER] Production optimizations enabled`);
  } else {
    console.log(`🛠️ [SERVER] Development mode - Enhanced debugging enabled`);
  }

  console.log(
    `📡 [SERVER] API endpoints available at http://localhost:${SERVER_CONFIG.PORT}/api/`
  );
  console.log(
    `💻 [SERVER] Frontend served at http://localhost:${SERVER_CONFIG.PORT}/`
  );
  console.log(
    `🏥 [SERVER] Health check at http://localhost:${SERVER_CONFIG.PORT}/api/health`
  );

  logger.info(
    `[SERVER] Running on port ${SERVER_CONFIG.PORT} in ${SERVER_CONFIG.NODE_ENV} mode`
  );
  logger.info(
    `[UQUID] API Key: ${UQUID_CONFIG.API_KEY ? "Loaded" : "Missing"}`
  );
  logger.info(
    `[KASHIER] Payment API Key: ${
      KASHIER_CONFIG.API_KEY ? "Loaded" : "Missing"
    }`
  );
  logger.info(
    `[KASHIER] Secret Key: ${KASHIER_CONFIG.API_SECRET ? "Loaded" : "Missing"}`
  );
  logger.info(
    `[KASHIER] Merchant ID: ${
      KASHIER_CONFIG.MERCHANT_ID ? "Loaded" : "Missing"
    }`
  );
  logger.info(`[KASHIER] Mode: ${KASHIER_CONFIG.MODE}`);

  if (SERVER_CONFIG.NODE_ENV === "production") {
    logger.info("Production optimizations enabled");
  }
});

// Handle graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

export default app;
