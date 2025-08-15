import mongoose from "mongoose";
import logger from "../middleware/logger.js";

// MongoDB configuration
export const MONGODB_CONFIG = {
  URL: process.env.MONGO_URL,
  USER: process.env.MONGO_USER,
  PASS: process.env.MONGO_PASS,
  OPTIONS: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
};

// Connect to MongoDB
export const connectDB = async () => {
  try {
    if (!MONGODB_CONFIG.URL) {
      throw new Error("MongoDB connection URL is not defined");
    }

    const conn = await mongoose.connect(
      MONGODB_CONFIG.URL,
      MONGODB_CONFIG.OPTIONS
    );

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ [DATABASE] MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
      console.error("❌ [DATABASE] MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      console.log("⚠️ [DATABASE] MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      console.log("🔄 [DATABASE] MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      console.log(
        "🔌 [DATABASE] MongoDB connection closed through app termination"
      );
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    console.error("❌ [DATABASE] MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    const conn = await mongoose.connect(
      MONGODB_CONFIG.URL,
      MONGODB_CONFIG.OPTIONS
    );
    await mongoose.connection.close();
    logger.info("Database connection test successful");
    console.log("✅ [DATABASE] Connection test successful");
    return true;
  } catch (error) {
    logger.error("Database connection test failed:", error);
    console.error("❌ [DATABASE] Connection test failed:", error.message);
    return false;
  }
};

// Get database status
export const getDBStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    state: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};
