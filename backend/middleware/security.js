import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { body, validationResult } from "express-validator";
import { BUSINESS_CONFIG } from "../config/index.js";

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://payments.kashier.io",
        "https://*.kashier.io",
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      frameSrc: [
        "'self'",
        "https://payments.kashier.io",
        "https://*.kashier.io",
      ],
      connectSrc: [
        "'self'",
        "https://shop.uquid.com",
        "https://payments.kashier.io",
        "https://*.kashier.io",
        "https://test-api.kashier.io",
        "https://api.kashier.io",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting middleware
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Speed limiting middleware
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per windowMs at full speed
  delayMs: () => 500, // Add 500ms delay after 5 requests (updated for v2)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Validation middleware
export const validatePhoneNumber = body("phoneNumber")
  .matches(BUSINESS_CONFIG.PHONE_REGEX)
  .withMessage("Invalid Vodafone Egypt phone number format");

export const validateAmount = body("amount")
  .isFloat({ min: BUSINESS_CONFIG.MIN_AMOUNT, max: BUSINESS_CONFIG.MAX_AMOUNT })
  .withMessage(
    `Amount must be between ${BUSINESS_CONFIG.MIN_AMOUNT} and ${BUSINESS_CONFIG.MAX_AMOUNT} EGP`
  );

export const validatePaymentData = [
  body("paymentId").notEmpty().withMessage("Payment ID is required"),
  body("reference").notEmpty().withMessage("Reference is required"),
];

// Error handling for validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors:", {
      url: req.url,
      method: req.method,
      body: req.body,
      errors: errors.array(),
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
      details: {
        phoneNumber: req.body.phoneNumber,
        amount: req.body.amount,
        expectedPhoneFormat: "010XXXXXXXX",
        expectedAmountRange: `${BUSINESS_CONFIG.MIN_AMOUNT}-${BUSINESS_CONFIG.MAX_AMOUNT} EGP`,
      },
    });
  }
  next();
};

// API key validation middleware
export const validateApiKeys = (req, res, next) => {
  const requiredKeys = ["UQ_PUBLIC_KEY", "UQ_SECRET_KEY"];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    console.error("Missing required environment variables:", missingKeys);
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  next();
};
