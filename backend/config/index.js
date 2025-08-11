import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  TRUST_PROXY: 1,
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

// Business logic configuration
export const BUSINESS_CONFIG = {
  MIN_AMOUNT: 5,
  MAX_AMOUNT: 2000,
  SERVICE_FEE_RATE: 0.2, // 20% service fee
  AVAILABLE_DENOMINATIONS: [100, 50, 25, 20, 15, 10],
  PHONE_REGEX: /^010[0-9]{8}$/,
  ORDER_DELAY_MS: 500, // Delay between orders
  CONFIRMATION_DELAY_MS: 500, // Delay between confirmations
  API_SEQUENCE_DELAY_MS: 1000, // Delay for API sequencing
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

// CORS configuration
export const CORS_CONFIG = {
  ALLOWED_ORIGINS: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // React dev server
    "http://localhost:3001", // Same origin
    process.env.FRONTEND_URL, // Environment variable for production
  ].filter(Boolean), // Remove undefined values
  CREDENTIALS: true,
  METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Required environment variables
export const REQUIRED_ENV_VARS = ["UQ_PUBLIC_KEY", "UQ_SECRET_KEY"];

// Validate required environment variables
export function validateEnvironment() {
  const missing = [];

  if (!UQUID_CONFIG.API_KEY || !UQUID_CONFIG.API_SECRET) {
    console.error(
      "❌ Missing Uquid API credentials. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
    );
    console.error("📝 Copy env.example to .env and fill in your API keys");
    missing.push("Uquid credentials");
  }

  return missing;
}

// Check if all required configurations are available
export function isConfigurationValid() {
  return UQUID_CONFIG.API_KEY && UQUID_CONFIG.API_SECRET;
}
