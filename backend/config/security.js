import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Security Configuration
export const SECURITY_CONFIG = {
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    SPEED_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    SPEED_LIMIT_DELAY_AFTER: 5,
    SPEED_LIMIT_DELAY_MS: 500,
    SPEED_LIMIT_MAX_DELAY_MS: 20000,
  },

  // Request Limits
  REQUEST_LIMITS: {
    JSON_LIMIT: process.env.JSON_LIMIT || "10mb",
    URL_ENCODED_LIMIT: process.env.URL_ENCODED_LIMIT || "10mb",
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FIELD_SIZE: 1024 * 1024, // 1MB
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: [
      // Development origins
      ...(process.env.NODE_ENV === "development"
        ? [
            "http://localhost:5173", // Vite dev server
            "http://localhost:3000", // React dev server
            "http://localhost:3001", // Same origin
          ]
        : []),
      // Production origins
      ...(process.env.NODE_ENV === "production"
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
    ALLOWED_HEADERS: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-API-Key",
    ],
    EXPOSED_HEADERS: ["X-Total-Count"],
    MAX_AGE: 86400, // 24 hours
  },

  // Content Security Policy
  CSP: {
    DIRECTIVES: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],
      imgSrc: ["'self'", "data:", "https:", "https://cdn.jsdelivr.net"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://payments.kashier.io",
        "https://*.kashier.io",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
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
        "https://cdn.jsdelivr.net",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
      reportUri: process.env.CSP_REPORT_URI || "/api/csp-violation",
    },
  },

  // Helmet Configuration
  HELMET: {
    CONTENT_SECURITY_POLICY: true,
    CROSS_ORIGIN_EMBEDDER_POLICY: false,
    CROSS_ORIGIN_RESOURCE_POLICY: { policy: "cross-origin" },
    DNS_PREFETCH_CONTROL: { allow: false },
    EXPECT_CT: {
      enforce: true,
      maxAge: 30,
      reportUri: process.env.CT_REPORT_URI,
    },
    FRAMEGUARD: { action: "deny" },
    HIDE_POWERED_BY: true,
    HSTS: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    IE_NO_OPEN: true,
    NO_SNIFF: true,
    PERMITTED_CROSS_DOMAIN_POLICIES: { permittedPolicies: "none" },
    REFERRER_POLICY: { policy: "strict-origin-when-cross-origin" },
    XSS_FILTER: true,
  },

  // Cookie Security
  COOKIES: {
    SECRET:
      process.env.COOKIE_SECRET ||
      "your-super-secret-cookie-key-change-in-production",
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === "production",
    SAME_SITE: "strict",
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    DOMAIN: process.env.COOKIE_DOMAIN,
    PATH: "/",
  },

  // CSRF Protection
  CSRF: {
    COOKIE: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
    IGNORE_METHODS: ["GET", "HEAD", "OPTIONS"],
    IGNORE_PATHS: ["/api/health", "/api/csp-violation"],
  },

  // Input Validation
  VALIDATION: {
    PHONE_REGEX: /^010[0-9]{8}$/,
    AMOUNT_MIN: parseInt(process.env.MIN_AMOUNT) || 8,
    AMOUNT_MAX: parseInt(process.env.MAX_AMOUNT) || 2000,
    MAX_STRING_LENGTH: 1000,
    ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "image/gif"],
    MAX_FILE_COUNT: 5,
  },

  // Security Monitoring
  MONITORING: {
    ENABLE_SUSPICIOUS_ACTIVITY_LOGGING: true,
    ENABLE_CSP_VIOLATION_LOGGING: true,
    ENABLE_RATE_LIMIT_LOGGING: true,
    LOG_LEVEL: process.env.SECURITY_LOG_LEVEL || "warn",
    ALERT_EMAIL: process.env.SECURITY_ALERT_EMAIL,
  },

  // API Security
  API: {
    KEY_HEADER: "X-API-Key",
    RATE_LIMIT_BY_IP: true,
    RATE_LIMIT_BY_USER_AGENT: true,
    REQUIRE_API_KEY: process.env.REQUIRE_API_KEY === "true",
    API_KEY_ROTATION_DAYS: 90,
  },

  // Session Security
  SESSION: {
    SECRET:
      process.env.SESSION_SECRET ||
      "your-super-secret-session-key-change-in-production",
    RESAVE: false,
    SAVE_UNINITIALIZED: false,
    COOKIE: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },

  // Encryption
  ENCRYPTION: {
    ALGORITHM: "aes-256-gcm",
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    SALT_ROUNDS: 12,
  },

  // Headers
  HEADERS: {
    X_CONTENT_TYPE_OPTIONS: "nosniff",
    X_FRAME_OPTIONS: "DENY",
    X_XSS_PROTECTION: "1; mode=block",
    STRICT_TRANSPORT_SECURITY: "max-age=31536000; includeSubDomains; preload",
    REFERRER_POLICY: "strict-origin-when-cross-origin",
    PERMISSIONS_POLICY: "geolocation=(), microphone=(), camera=()",
    X_DNS_PREFETCH_CONTROL: "off",
    X_DOWNLOAD_OPTIONS: "noopen",
    X_PERMITTED_CROSS_DOMAIN_POLICIES: "none",
  },
};

// Suspicious patterns for security monitoring
export const SUSPICIOUS_PATTERNS = {
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /vbscript:/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ],
  SQL_INJECTION: [
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+set/gi,
    /alter\s+table/gi,
    /create\s+table/gi,
    /exec\s*\(/gi,
    /execute\s*\(/gi,
    /xp_cmdshell/gi,
  ],
  NO_SQL_INJECTION: [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$regex/gi,
    /\$exists/gi,
    /\$in/gi,
    /\$nin/gi,
    /\$or/gi,
    /\$and/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//gi,
    /\.\.\\/gi,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ],
  COMMAND_INJECTION: [
    /[;&|`$()]/g,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
  ],
};

// Security response codes and messages
export const SECURITY_RESPONSES = {
  RATE_LIMIT_EXCEEDED: {
    code: 429,
    message: "Too many requests, please try again later.",
  },
  SUSPICIOUS_ACTIVITY: {
    code: 403,
    message: "Access denied due to suspicious activity.",
  },
  INVALID_INPUT: {
    code: 400,
    message: "Invalid input provided.",
  },
  UNAUTHORIZED: {
    code: 401,
    message: "Unauthorized access.",
  },
  FORBIDDEN: {
    code: 403,
    message: "Access forbidden.",
  },
  PAYLOAD_TOO_LARGE: {
    code: 413,
    message: "Request entity too large.",
  },
  CSP_VIOLATION: {
    code: 204,
    message: "Content Security Policy violation logged.",
  },
};

// Environment-specific security settings
export const getSecuritySettings = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    ...SECURITY_CONFIG,
    COOKIES: {
      ...SECURITY_CONFIG.COOKIES,
      SECURE: isProduction,
    },
    CSRF: {
      ...SECURITY_CONFIG.CSRF,
      COOKIE: {
        ...SECURITY_CONFIG.CSRF.COOKIE,
        SECURE: isProduction,
      },
    },
    SESSION: {
      ...SECURITY_CONFIG.SESSION,
      COOKIE: {
        ...SECURITY_CONFIG.SESSION.COOKIE,
        SECURE: isProduction,
      },
    },
  };
};
