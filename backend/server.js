import createApp from "./app.js";
import logger from "./middleware/logger.js";
import { connectDB } from "./config/database.js";
import {
  SERVER_CONFIG,
  UQUID_CONFIG,
  KASHIER_CONFIG,
  MONGODB_CONFIG,
  JWT_CONFIG,
  validateEnvironment,
} from "./config/index.js";

// Validate environment variables
const missingVars = validateEnvironment();

// Create Express application
const app = createApp();

// Global error handling middleware
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(7);

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    let message = "";
    if (field === "email") {
      message = "البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول إذا كان لديك حساب بالفعل.";
    } else if (field === "phone") {
      message = "رقم الهاتف مستخدم بالفعل. يرجى استخدام رقم هاتف آخر.";
    } else {
      message = `القيمة '${value}' مستخدمة بالفعل في حقل '${field}'.`;
    }

    logger.error(`[ERROR-${errorId}] Duplicate key error:`, {
      error: err.message,
      field,
      value,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      message,
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = errors.join(". ");
    
    logger.error(`[ERROR-${errorId}] Validation error:`, {
      error: err.message,
      errors,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      message,
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    logger.error(`[ERROR-${errorId}] JWT error:`, {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      success: false,
      message: "رمز المصادقة غير صحيح. يرجى تسجيل الدخول مرة أخرى.",
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT expiration
  if (err.name === "TokenExpiredError") {
    logger.error(`[ERROR-${errorId}] JWT expired:`, {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      success: false,
      message: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.",
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle other known errors
  if (err.status && err.status !== 500) {
    logger.error(`[ERROR-${errorId}] Known error:`, {
      error: err.message,
      status: err.status,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
      body: req.body,
    });

    return res.status(err.status).json({
      success: false,
      message: err.message,
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle all other errors
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
      ? "حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً."
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

// Global server variable for graceful shutdown
let server;

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error("Error during graceful shutdown:", err);
        process.exit(1);
      }
      logger.info("Server closed successfully");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start server after database connection
    server = app.listen(SERVER_CONFIG.PORT, "0.0.0.0", () => {
      console.log(`🚀 [SERVER] === APPLICATION STARTUP COMPLETED ===`);
      console.log(
        `🌐 [SERVER] Running on port ${SERVER_CONFIG.PORT} in ${SERVER_CONFIG.NODE_ENV} mode`
      );
      console.log(
        `🗄️ [DATABASE] MongoDB: ${
          MONGODB_CONFIG.URL ? "✅ Connected" : "❌ Not Connected"
        }`
      );
      console.log(
        `🔑 [JWT] Secret: ${
          JWT_CONFIG.SECRET !== "your-super-secret-jwt-key-change-in-production"
            ? "✅ Set"
            : "❌ Default"
        }`
      );
      console.log(
        `🔑 [UQUID] API Key: ${
          UQUID_CONFIG.API_KEY ? "✅ Loaded" : "❌ Missing"
        }`
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
        console.log(
          `🛠️ [SERVER] Development mode - Enhanced debugging enabled`
        );
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
        `[DATABASE] MongoDB: ${
          MONGODB_CONFIG.URL ? "Connected" : "Not Connected"
        }`
      );
      logger.info(
        `[JWT] Secret: ${
          JWT_CONFIG.SECRET !== "your-super-secret-jwt-key-change-in-production"
            ? "Set"
            : "Default"
        }`
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
        `[KASHIER] Secret Key: ${
          KASHIER_CONFIG.API_SECRET ? "Loaded" : "Missing"
        }`
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

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    console.error("❌ [SERVER] Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
