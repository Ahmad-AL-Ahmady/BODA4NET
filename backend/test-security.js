import axios from "axios";
import { createApp } from "./app.js";

// Security test configuration
const TEST_CONFIG = {
  BASE_URL: "http://localhost:3001",
  TEST_ENDPOINTS: [
    "/api/payment/create",
    "/api/kashier/create-session",
    "/api/health",
  ],
  XSS_PAYLOADS: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    "<iframe src=\"javascript:alert('XSS')\"></iframe>",
  ],
  SQL_INJECTION_PAYLOADS: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "'; UPDATE users SET password='hacked'; --",
  ],
  NO_SQL_INJECTION_PAYLOADS: [
    '{"$where": "1==1"}',
    '{"$ne": "admin"}',
    '{"$gt": "", "$lt": ""}',
    '{"$regex": ".*"}',
  ],
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper function to log test results
function logTest(name, passed, details = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  const result = { name, passed, details, timestamp: new Date().toISOString() };
  testResults.tests.push(result);

  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  console.log(`${status} ${name}${details ? ` - ${details}` : ""}`);
  return result;
}

// Test security headers
async function testSecurityHeaders() {
  console.log("\n🔒 Testing Security Headers...");

  try {
    const response = await axios.get(`${TEST_CONFIG.BASE_URL}/api/health`);
    const headers = response.headers;

    // Test required security headers
    const requiredHeaders = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-xss-protection": "1; mode=block",
      "strict-transport-security":
        "max-age=31536000; includeSubDomains; preload",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "geolocation=(), microphone=(), camera=()",
    };

    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const actualValue = headers[header];
      const passed =
        actualValue && actualValue.includes(expectedValue.split(";")[0]);
      logTest(
        `Security Header: ${header}`,
        passed,
        passed
          ? `Found: ${actualValue}`
          : `Expected: ${expectedValue}, Got: ${actualValue}`
      );
    }

    // Test CSP header
    const cspHeader = headers["content-security-policy"];
    const cspPassed = cspHeader && cspHeader.includes("default-src 'self'");
    logTest(
      "Content Security Policy",
      cspPassed,
      cspPassed ? "CSP header found" : "CSP header missing or invalid"
    );
  } catch (error) {
    logTest("Security Headers Test", false, `Request failed: ${error.message}`);
  }
}

// Test XSS protection
async function testXSSProtection() {
  console.log("\n🛡️ Testing XSS Protection...");

  for (const payload of TEST_CONFIG.XSS_PAYLOADS) {
    try {
      const response = await axios.post(
        `${TEST_CONFIG.BASE_URL}/api/payment/create`,
        {
          phoneNumber: `0101234567${payload}`,
          amount: "10",
        }
      );

      // Check if the response contains the XSS payload
      const responseText = JSON.stringify(response.data);
      const xssDetected = responseText.includes(payload);

      logTest(
        `XSS Protection: ${payload.substring(0, 20)}...`,
        !xssDetected,
        xssDetected
          ? "XSS payload found in response"
          : "XSS payload properly sanitized"
      );
    } catch (error) {
      // If request fails due to validation, that's good
      const isValidationError = error.response?.status === 400;
      logTest(
        `XSS Protection: ${payload.substring(0, 20)}...`,
        isValidationError,
        isValidationError
          ? "Request properly rejected"
          : `Unexpected error: ${error.message}`
      );
    }
  }
}

// Test SQL injection protection
async function testSQLInjectionProtection() {
  console.log("\n💉 Testing SQL Injection Protection...");

  for (const payload of TEST_CONFIG.SQL_INJECTION_PAYLOADS) {
    try {
      const response = await axios.post(
        `${TEST_CONFIG.BASE_URL}/api/payment/create`,
        {
          phoneNumber: `0101234567${payload}`,
          amount: "10",
        }
      );

      // Check if the response contains SQL injection patterns
      const responseText = JSON.stringify(response.data);
      const sqlDetected =
        /(union|select|drop|insert|update|delete|alter|create)/i.test(
          responseText
        );

      logTest(
        `SQL Injection Protection: ${payload.substring(0, 20)}...`,
        !sqlDetected,
        sqlDetected
          ? "SQL injection pattern found"
          : "SQL injection properly blocked"
      );
    } catch (error) {
      const isValidationError = error.response?.status === 400;
      logTest(
        `SQL Injection Protection: ${payload.substring(0, 20)}...`,
        isValidationError,
        isValidationError
          ? "Request properly rejected"
          : `Unexpected error: ${error.message}`
      );
    }
  }
}

// Test NoSQL injection protection
async function testNoSQLInjectionProtection() {
  console.log("\n🗄️ Testing NoSQL Injection Protection...");

  for (const payload of TEST_CONFIG.NO_SQL_INJECTION_PAYLOADS) {
    try {
      const response = await axios.post(
        `${TEST_CONFIG.BASE_URL}/api/payment/create`,
        {
          phoneNumber: `0101234567${payload}`,
          amount: "10",
        }
      );

      // Check if the response contains NoSQL injection patterns
      const responseText = JSON.stringify(response.data);
      const noSqlDetected = /\$[a-z]+/i.test(responseText);

      logTest(
        `NoSQL Injection Protection: ${payload.substring(0, 20)}...`,
        !noSqlDetected,
        noSqlDetected
          ? "NoSQL injection pattern found"
          : "NoSQL injection properly blocked"
      );
    } catch (error) {
      const isValidationError = error.response?.status === 400;
      logTest(
        `NoSQL Injection Protection: ${payload.substring(0, 20)}...`,
        isValidationError,
        isValidationError
          ? "Request properly rejected"
          : `Unexpected error: ${error.message}`
      );
    }
  }
}

// Test rate limiting
async function testRateLimiting() {
  console.log("\n⏱️ Testing Rate Limiting...");

  try {
    const requests = [];
    const maxRequests = 5;

    // Make multiple rapid requests
    for (let i = 0; i < maxRequests + 2; i++) {
      requests.push(
        axios.get(`${TEST_CONFIG.BASE_URL}/api/health`).catch((error) => error)
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(
      (response) =>
        response.response?.status === 429 ||
        response.response?.data?.message?.includes("Too many requests")
    );

    logTest(
      "Rate Limiting",
      rateLimited,
      rateLimited ? "Rate limiting working" : "Rate limiting not enforced"
    );
  } catch (error) {
    logTest("Rate Limiting", false, `Test failed: ${error.message}`);
  }
}

// Test input validation
async function testInputValidation() {
  console.log("\n✅ Testing Input Validation...");

  const testCases = [
    {
      name: "Invalid Phone Number",
      data: { phoneNumber: "1234567890", amount: "10" },
      shouldFail: true,
    },
    {
      name: "Invalid Amount (Negative)",
      data: { phoneNumber: "0101234567", amount: "-10" },
      shouldFail: true,
    },
    {
      name: "Invalid Amount (Too High)",
      data: { phoneNumber: "0101234567", amount: "10000" },
      shouldFail: true,
    },
    {
      name: "Missing Required Fields",
      data: { phoneNumber: "0101234567" },
      shouldFail: true,
    },
    {
      name: "Valid Input",
      data: { phoneNumber: "0101234567", amount: "10" },
      shouldFail: false,
    },
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.post(
        `${TEST_CONFIG.BASE_URL}/api/payment/create`,
        testCase.data
      );
      const passed = !testCase.shouldFail;
      logTest(
        `Input Validation: ${testCase.name}`,
        passed,
        passed
          ? "Valid input accepted"
          : "Invalid input should have been rejected"
      );
    } catch (error) {
      const passed = testCase.shouldFail && error.response?.status === 400;
      logTest(
        `Input Validation: ${testCase.name}`,
        passed,
        passed
          ? "Invalid input properly rejected"
          : `Unexpected error: ${error.message}`
      );
    }
  }
}

// Test CORS protection
async function testCORSProtection() {
  console.log("\n🌐 Testing CORS Protection...");

  try {
    // Test with different origins
    const testOrigins = [
      "https://malicious-site.com",
      "http://localhost:3000",
      "https://boda4net.com",
    ];

    for (const origin of testOrigins) {
      try {
        const response = await axios.get(`${TEST_CONFIG.BASE_URL}/api/health`, {
          headers: { Origin: origin },
        });

        const corsHeader = response.headers["access-control-allow-origin"];
        const isAllowed = corsHeader === origin || corsHeader === "*";

        logTest(
          `CORS Protection: ${origin}`,
          !isAllowed || origin === "https://boda4net.com",
          isAllowed
            ? `Origin allowed: ${corsHeader}`
            : "Origin properly blocked"
        );
      } catch (error) {
        logTest(
          `CORS Protection: ${origin}`,
          true,
          "Request blocked as expected"
        );
      }
    }
  } catch (error) {
    logTest("CORS Protection", false, `Test failed: ${error.message}`);
  }
}

// Main test runner
async function runSecurityTests() {
  console.log("🔒 Starting Security Tests for Boda4Net Backend...\n");

  try {
    await testSecurityHeaders();
    await testXSSProtection();
    await testSQLInjectionProtection();
    await testNoSQLInjectionProtection();
    await testRateLimiting();
    await testInputValidation();
    await testCORSProtection();

    // Print summary
    console.log("\n📊 Security Test Summary:");
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(
      `📈 Success Rate: ${(
        (testResults.passed / (testResults.passed + testResults.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (testResults.failed > 0) {
      console.log("\n❌ Failed Tests:");
      testResults.tests
        .filter((test) => !test.passed)
        .forEach((test) => {
          console.log(`  - ${test.name}: ${test.details}`);
        });
    }

    console.log("\n🔒 Security Test Complete!");
  } catch (error) {
    console.error("❌ Security test runner failed:", error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests();
}

export { runSecurityTests, testResults };
