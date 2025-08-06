import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { body, validationResult } from "express-validator";

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://shop.uquid.com",
        "https://gate.sha7nawy.com",
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
  .matches(/^010[0-9]{8}$/)
  .withMessage("Invalid Vodafone Egypt phone number format");

export const validateAmount = body("amount")
  .isFloat({ min: 5, max: 1000 })
  .withMessage("Amount must be between 5 and 1000 EGP");

export const validatePaymentData = [
  body("paymentId").notEmpty().withMessage("Payment ID is required"),
  body("reference").notEmpty().withMessage("Reference is required"),
];

// Error handling for validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// API key validation middleware
export const validateApiKeys = (req, res, next) => {
  const requiredKeys = [
    "UQ_PUBLIC_KEY",
    "UQ_SECRET_KEY",
    "SHA7NAWY_PUBLIC_KEY",
    "SHA7NAWY_SECRET_KEY",
  ];

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
