import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { body, validationResult } from "express-validator";
import { BUSINESS_CONFIG } from "../config/index.js";
import xss from "xss-clean";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import csrf from "csurf";
import cookieParser from "cookie-parser";

// Enhanced security headers middleware
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
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// XSS Protection middleware
export const xssProtection = xss();

// HTTP Parameter Pollution Protection
export const hppProtection = hpp();

// NoSQL Injection Protection (even though we don't use MongoDB, good practice)
export const noSqlInjectionProtection = mongoSanitize();

// CSRF Protection middleware
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// Enhanced input sanitization
export const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key].trim();
        // Remove potential script tags
        req.body[key] = req.body[key].replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = req.query[key].trim();
        req.query[key] = req.query[key].replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
      }
    });
  }

  next();
};

// Request size limiting middleware
export const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.headers["content-length"] || "0");
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: "Request entity too large",
    });
  }

  next();
};

// Enhanced rate limiting middleware
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
    // Enhanced rate limiting
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => {
      // Use IP + User-Agent for better rate limiting
      return req.ip + req.headers["user-agent"];
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Speed limiting middleware
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per windowMs at full speed
  delayMs: () => 500, // Add 500ms delay after 5 requests (updated for v2)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Enhanced validation middleware with better sanitization
export const validatePhoneNumber = body("phoneNumber")
  .trim()
  .escape()
  .matches(BUSINESS_CONFIG.PHONE_REGEX)
  .withMessage("Invalid Vodafone Egypt phone number format");

export const validateAmount = body("amount")
  .trim()
  .escape()
  .isFloat({ min: BUSINESS_CONFIG.MIN_AMOUNT, max: BUSINESS_CONFIG.MAX_AMOUNT })
  .withMessage(
    `Amount must be between ${BUSINESS_CONFIG.MIN_AMOUNT} and ${BUSINESS_CONFIG.MAX_AMOUNT} EGP`
  );

export const validatePaymentData = [
  body("paymentId")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Payment ID is required"),
  body("reference")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Reference is required"),
];

// Enhanced validation for all user inputs
export const validateUserInput = [
  body("phoneNumber")
    .trim()
    .escape()
    .matches(BUSINESS_CONFIG.PHONE_REGEX)
    .withMessage("Invalid phone number format"),
  body("amount")
    .trim()
    .escape()
    .isFloat({
      min: BUSINESS_CONFIG.MIN_AMOUNT,
      max: BUSINESS_CONFIG.MAX_AMOUNT,
    })
    .withMessage("Invalid amount"),
  body("vodafoneCashNumber")
    .optional()
    .trim()
    .escape()
    .matches(BUSINESS_CONFIG.PHONE_REGEX)
    .withMessage("Invalid Vodafone Cash number format"),
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
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
      details: {
        phoneNumber: req.body.phoneNumber
          ? "***" + req.body.phoneNumber.slice(-4)
          : null,
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

// Security monitoring middleware
export const securityMonitor = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
  ];

  const requestBody = JSON.stringify(req.body);
  const requestQuery = JSON.stringify(req.query);
  const requestUrl = req.url;

  const suspiciousActivity = suspiciousPatterns.some(
    (pattern) =>
      pattern.test(requestBody) ||
      pattern.test(requestQuery) ||
      pattern.test(requestUrl)
  );

  if (suspiciousActivity) {
    console.warn("🚨 Suspicious activity detected:", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Content Security Policy violation handler
export const cspViolationHandler = (req, res) => {
  console.error("🚨 CSP Violation:", {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    violation: req.body,
    timestamp: new Date().toISOString(),
  });

  res.status(204).end();
};

// Security headers for specific routes
export const additionalSecurityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  next();
};

// Cookie security middleware
export const secureCookies = cookieParser(
  process.env.COOKIE_SECRET || "your-secret-key"
);

// Export all security middlewares for easy use
export const securityMiddleware = [
  securityHeaders,
  xssProtection,
  hppProtection,
  noSqlInjectionProtection,
  sanitizeInput,
  requestSizeLimit,
  securityMonitor,
  additionalSecurityHeaders,
];
