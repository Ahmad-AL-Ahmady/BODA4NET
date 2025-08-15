import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  TRUST_PROXY: 1,
};

// MongoDB configuration
export const MONGODB_CONFIG = {
  URL: process.env.MONGO_URL,
  USER: process.env.MONGO_USER,
  PASS: process.env.MONGO_PASS,
  OPTIONS: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
  },
};

// JWT configuration
export const JWT_CONFIG = {
  SECRET:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || "90d",
  COOKIE_EXPIRES_IN: parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 90,
};

// Email configuration
export const EMAIL_CONFIG = {
  HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  PORT: parseInt(process.env.EMAIL_PORT) || 587,
  USER: process.env.EMAIL_USER,
  PASS: process.env.EMAIL_PASS,
  FROM: process.env.EMAIL_FROM || "noreply@boda4net.com",
};

// Base URL configuration
export const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

// Google OAuth configuration
export const GOOGLE_CONFIG = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/api/auth/google/callback`,
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  SPEED_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  SPEED_LIMIT_DELAY_AFTER: 5,
  SPEED_LIMIT_DELAY_MS: 500,
  SPEED_LIMIT_MAX_DELAY_MS: 20000,
};

// Uquid API configuration
export const UQUID_CONFIG = {
  API_KEY: process.env.UQ_PUBLIC_KEY?.trim(),
  API_SECRET: process.env.UQ_SECRET_KEY?.trim(),
  BASE_URL:
    "https://shop.uquid.com/partner/2d191ca843a47b2c98f42dd4fb6d49f2/api/",
  TIMEOUT: 45000,
  MAX_API_AMOUNT: 200, // Maximum amount per API call
};

// Kashier API configuration
export const KASHIER_CONFIG = {
  API_KEY: process.env.KASHIER_PAYMENT_API_KEY?.trim(),
  API_SECRET: process.env.KASHIER_SECRET_KEY?.trim(),
  MERCHANT_ID: process.env.KASHIER_MERCHANT_ID?.trim(),
  MODE: process.env.KASHIER_MODE || "test", // test or live
  BASE_URL:
    process.env.KASHIER_MODE === "live"
      ? "https://api.kashier.io"
      : "https://test-api.kashier.io",
  PAYMENT_UI_URL: "https://payments.kashier.io/kashier-checkout.js",
  SESSION_URL:
    process.env.KASHIER_MODE === "live"
      ? "https://payments.kashier.io/session"
      : "https://payments.kashier.io/session",
};

// Business logic configuration
export const BUSINESS_CONFIG = {
  MIN_AMOUNT: parseInt(process.env.MIN_AMOUNT) || 8,
  MAX_AMOUNT: parseInt(process.env.MAX_AMOUNT) || 2000,
  SERVICE_FEE_RATE: parseFloat(process.env.SERVICE_FEE_RATE) || 0.2, // 20% service fee
  AVAILABLE_DENOMINATIONS: [100, 50, 25, 20, 15, 10],
  PHONE_REGEX: /^010[0-9]{8}$/,
  ORDER_DELAY_MS: parseInt(process.env.ORDER_DELAY_MS) || 500, // Delay between orders
  CONFIRMATION_DELAY_MS: parseInt(process.env.CONFIRMATION_DELAY_MS) || 500, // Delay between confirmations
  API_SEQUENCE_DELAY_MS: parseInt(process.env.API_SEQUENCE_DELAY_MS) || 1000, // Delay for API sequencing
  // Production settings
  ENABLE_LOGGING: process.env.ENABLE_LOGGING !== "false",
  ENABLE_METRICS: process.env.ENABLE_METRICS !== "false",
  SESSION_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS) || 600000, // 10 minutes
};

// Logging configuration
export const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || "info",
  SERVICE_NAME: "boda4net-backend",
};

// Validation configuration
export const VALIDATION_CONFIG = {
  JSON_LIMIT: "10mb",
  URL_ENCODED_LIMIT: "10mb",
};

// Health check configuration
export const HEALTH_CONFIG = {
  VERSION: "1.0.0",
  HEALTH_TIMEOUT: 5000,
};

// Frontend URL configuration
export const FRONTEND_CONFIG = {
  URL:
    process.env.FRONTEND_URL ||
    (SERVER_CONFIG.NODE_ENV === "development"
      ? "http://localhost:5173"
      : "https://boda4net.com"),
  DEV_URL: "http://localhost:5173",
  PROD_URL: process.env.FRONTEND_URL || "https://boda4net.com",
};

// CORS configuration
export const CORS_CONFIG = {
  ALLOWED_ORIGINS: [
    // Development origins
    ...(SERVER_CONFIG.NODE_ENV === "development"
      ? [
          "http://localhost:5173", // Vite dev server
          "http://localhost:3000", // React dev server
          "http://localhost:3001", // Same origin
        ]
      : []),
    // Production origins
    ...(SERVER_CONFIG.NODE_ENV === "production"
      ? [
          "https://boda4net.com",
          "https://www.boda4net.com",
          process.env.FRONTEND_URL, // Production frontend URL
          process.env.ADMIN_URL, // Admin panel URL (if different)
        ].filter(Boolean)
      : []),
  ],
  CREDENTIALS: true,
  METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Required environment variables
export const REQUIRED_ENV_VARS = [
  "MONGO_URL",
  "JWT_SECRET",
  "UQ_PUBLIC_KEY",
  "UQ_SECRET_KEY",
  "KASHIER_PAYMENT_API_KEY",
  "KASHIER_SECRET_KEY",
  "KASHIER_MERCHANT_ID",
];

// Validate required environment variables
export function validateEnvironment() {
  const missing = [];

  if (!MONGODB_CONFIG.URL) {
    console.error(
      "❌ Missing MongoDB connection URL. Please set MONGO_URL in your .env file"
    );
    console.error("📝 Copy env.example to .env and fill in your MongoDB URL");
    missing.push("MongoDB URL");
  }

  if (
    !JWT_CONFIG.SECRET ||
    JWT_CONFIG.SECRET === "your-super-secret-jwt-key-change-in-production"
  ) {
    console.error(
      "❌ Missing or default JWT secret. Please set JWT_SECRET in your .env file"
    );
    console.error("📝 Set a strong JWT secret for security");
    missing.push("JWT secret");
  }

  if (!UQUID_CONFIG.API_KEY || !UQUID_CONFIG.API_SECRET) {
    console.error(
      "❌ Missing Uquid API credentials. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
    );
    console.error("📝 Copy env.example to .env and fill in your API keys");
    missing.push("Uquid credentials");
  }

  if (
    !KASHIER_CONFIG.API_KEY ||
    !KASHIER_CONFIG.API_SECRET ||
    !KASHIER_CONFIG.MERCHANT_ID
  ) {
    console.error(
      "❌ Missing Kashier API credentials. Please set KASHIER_PAYMENT_API_KEY, KASHIER_SECRET_KEY and KASHIER_MERCHANT_ID in your .env file"
    );
    console.error(
      "📝 Copy env.example to .env and fill in your Kashier API keys"
    );
    missing.push("Kashier credentials");
  }

  return missing;
}

// Check if all required configurations are available
export function isConfigurationValid() {
  return (
    MONGODB_CONFIG.URL &&
    JWT_CONFIG.SECRET &&
    JWT_CONFIG.SECRET !== "your-super-secret-jwt-key-change-in-production" &&
    UQUID_CONFIG.API_KEY &&
    UQUID_CONFIG.API_SECRET &&
    KASHIER_CONFIG.API_KEY &&
    KASHIER_CONFIG.API_SECRET &&
    KASHIER_CONFIG.MERCHANT_ID
  );
}
