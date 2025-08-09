import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Uquid API configuration
const UQUID_API_KEY = process.env.UQ_PUBLIC_KEY;
const UQUID_API_SECRET = process.env.UQ_SECRET_KEY;
const UQUID_BASE_URL =
  "https://shop.uquid.com/partner/2d191ca843a47b2c98f42dd4fb6d49f2/api/";

/**
 * Generates an HMAC-SHA256 signature for Uquid API requests.
 * @param {object} requestBody - The request body object.
 * @param {string} secret - The Uquid API secret key.
 * @returns {string} The generated hexadecimal signature.
 */
function generateSignature(requestBody, secret) {
  // Convert to JSON string (exactly as the API expects)
  const params = JSON.stringify(requestBody);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(params)
    .digest("hex");

  return signature;
}

/**
 * Makes a ping request to the Uquid API.
 * @returns {Promise<object>} The response data from the API.
 */
async function pingUquidAPI() {
  console.log("🔄 [PING] Starting Uquid API ping test...");
  console.log(`📡 [PING] API URL: ${UQUID_BASE_URL}`);
  console.log(
    `🔑 [PING] API Key: ${UQUID_API_KEY ? "✅ Loaded" : "❌ Missing"}`
  );
  console.log(
    `🔐 [PING] Secret Key: ${UQUID_API_SECRET ? "✅ Loaded" : "❌ Missing"}`
  );

  const startTime = Date.now();

  try {
    // Check if API keys are configured
    if (!UQUID_API_KEY || !UQUID_API_SECRET) {
      throw new Error(
        "Uquid API credentials not configured. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
      );
    }

    // Create ping request body with current UTC timestamp
    const requestBody = {
      action: "ping",
      nonce: Math.round(Date.now() / 1000).toString(), // UTC unix timestamp
    };

    console.log(
      `📤 [PING] Request body:`,
      JSON.stringify(requestBody, null, 2)
    );

    // Generate signature
    const signature = generateSignature(requestBody, UQUID_API_SECRET);
    console.log(`🔏 [PING] Generated signature: ${signature}`);

    // Build URL with API key and signature
    const url = `${UQUID_BASE_URL}?api_key=${UQUID_API_KEY}&signature=${signature}`;

    // Make the API request
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    const duration = Date.now() - startTime;

    console.log(`⏱️ [PING] Request completed in ${duration}ms`);
    console.log(`📥 [PING] Response status: ${response.status}`);
    console.log(
      `📥 [PING] Response data:`,
      JSON.stringify(response.data, null, 2)
    );

    if (response.data.status) {
      console.log("✅ [PING] SUCCESS: Uquid API is responding correctly!");
      console.log(
        `🕐 [PING] Server time: ${response.data.data?.time || "Not provided"}`
      );
      console.log(`💬 [PING] Message: ${response.data.message || "Pong!"}`);
    } else {
      console.log("⚠️ [PING] WARNING: API responded but status is false");
      console.log(
        `❌ [PING] Error: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`❌ [PING] FAILED after ${duration}ms`);
    console.log(`🚨 [PING] Error message: ${error.message}`);

    if (error.response) {
      console.log(`📊 [PING] HTTP Status: ${error.response.status}`);
      console.log(`📊 [PING] Status Text: ${error.response.statusText}`);
      console.log(
        `📊 [PING] Response data:`,
        error.response.data || "No response data"
      );
    } else if (error.request) {
      console.log(`🌐 [PING] Network error - no response received`);
    } else {
      console.log(`⚙️ [PING] Request setup error: ${error.message}`);
    }

    throw error;
  }
}

// Main execution
async function main() {
  console.log("🚀 [PING] === UQUID API PING TEST ===");
  console.log(`📅 [PING] Started at: ${new Date().toISOString()}`);
  console.log("═".repeat(50));

  try {
    await pingUquidAPI();
    console.log("═".repeat(50));
    console.log("🎉 [PING] Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.log("═".repeat(50));
    console.log("💥 [PING] Test failed!");
    console.log(
      `🔍 [PING] Please check your API credentials and network connection.`
    );
    process.exit(1);
  }
}

// Run the script
main();

