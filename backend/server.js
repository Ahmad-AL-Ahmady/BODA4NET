import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import morgan from "morgan";
import {
  securityHeaders,
  createRateLimit,
  speedLimiter,
  validatePhoneNumber,
  validateAmount,
  validatePaymentData,
  handleValidationErrors,
  validateApiKeys,
} from "./middleware/security.js";
import logger, { requestLogger, logTransaction } from "./middleware/logger.js";

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Global Middleware
app.use(compression()); // Gzip compression
app.use(securityHeaders); // Security headers

// Morgan HTTP request logging
app.use(
  morgan("🌐 :method :url :status :res[content-length] - :response-time ms", {
    immediate: false,
    stream: process.stdout,
  })
);

app.use(requestLogger); // Request logging

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.CORS_ORIGIN,
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use(
  "/api/",
  createRateLimit(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  )
);
app.use("/api/", speedLimiter);

// API key validation
app.use("/api/", validateApiKeys);

// Serve static files
app.use(express.static(path.join(__dirname, "../dist")));

// Uquid API configuration
const UQUID_API_KEY = process.env.UQ_PUBLIC_KEY;
const UQUID_API_SECRET = process.env.UQ_SECRET_KEY;
const UQUID_BASE_URL =
  "https://shop.uquid.com/partner/2d191ca843a47b2c98f42dd4fb6d49f2/api/";

// Sha7nawy Payment API configuration
const SHA7NAWY_PUBLIC_KEY = process.env.SHA7NAWY_PUBLIC_KEY?.trim();
const SHA7NAWY_SECRET_KEY = process.env.SHA7NAWY_SECRET_KEY?.trim();
const SHA7NAWY_BASE_URL = "https://gate.sha7nawy.com/api";

// Check for required environment variables
if (!UQUID_API_KEY || !UQUID_API_SECRET) {
  console.error(
    "❌ Missing Uquid API credentials. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
  );
  console.error("📝 Copy env.example to .env and fill in your API keys");
}

if (!SHA7NAWY_PUBLIC_KEY || !SHA7NAWY_SECRET_KEY) {
  console.error(
    "❌ Missing Sha7nawy API credentials. Please set SHA7NAWY_PUBLIC_KEY and SHA7NAWY_SECRET_KEY in your .env file"
  );
  console.error("📝 Copy env.example to .env and fill in your API keys");
}

// --- Helper Functions ---

/**
 * Calculate how to split a large payment amount into multiple API calls
 * Each API call is limited to 200 EGP maximum
 * @param {number} amount - The total amount to split
 * @returns {Array} Array of {amount, count} objects
 */
function calculateApiCallSplit(amount) {
  const MAX_API_AMOUNT = 200;

  if (amount <= MAX_API_AMOUNT) {
    return [{ amount: amount, count: 1 }];
  }

  const splits = [];
  let remainingAmount = amount;

  // Use as many 200 EGP calls as possible
  const count200 = Math.floor(remainingAmount / 200);
  if (count200 > 0) {
    splits.push({ amount: 200, count: count200 });
    remainingAmount -= count200 * 200;
  }

  // Split the remaining amount using available denominations
  if (remainingAmount > 0) {
    if (remainingAmount >= 100) {
      splits.push({ amount: 100, count: Math.floor(remainingAmount / 100) });
      remainingAmount %= 100;
    }
    if (remainingAmount >= 50) {
      splits.push({ amount: 50, count: Math.floor(remainingAmount / 50) });
      remainingAmount %= 50;
    }
    if (remainingAmount >= 25) {
      splits.push({ amount: 25, count: Math.floor(remainingAmount / 25) });
      remainingAmount %= 25;
    }
    if (remainingAmount >= 20) {
      splits.push({ amount: 20, count: Math.floor(remainingAmount / 20) });
      remainingAmount %= 20;
    }
    if (remainingAmount >= 15) {
      splits.push({ amount: 15, count: Math.floor(remainingAmount / 15) });
      remainingAmount %= 15;
    }
    if (remainingAmount >= 10) {
      splits.push({ amount: 10, count: Math.floor(remainingAmount / 10) });
      remainingAmount %= 10;
    }
    if (remainingAmount > 0) {
      splits.push({ amount: remainingAmount, count: 1 });
    }
  }

  return splits;
}

/**
 * Validate that products exist for all split amounts and calculate total cost
 * @param {Array} apiCallSplits - Array of {amount, count} objects
 * @param {Array} vodafoneProducts - Available Vodafone products
 * @returns {Promise<object>} {selectedProducts, totalRequiredBalance}
 */
async function validateAndGetSplitProducts(apiCallSplits, vodafoneProducts) {
  const selectedProducts = [];
  let totalRequiredBalance = 0;

  for (const split of apiCallSplits) {
    const product = vodafoneProducts.find(
      (p) => p.extra?.range?.currentFace === split.amount
    );

    if (!product) {
      throw new Error(
        `No suitable Uquid product found for amount ${split.amount} EGP`
      );
    }

    const productInfo = {
      ...product,
      requestedCount: split.count,
      totalPrice: product.price * split.count,
    };

    selectedProducts.push(productInfo);
    totalRequiredBalance += productInfo.totalPrice;
  }

  return { selectedProducts, totalRequiredBalance };
}

/**
 * Generates an HMAC-SHA256 signature for Uquid API requests (like ping-uquid.js and test-uquid.js).
 * @param {object} requestBody - The request body object.
 * @param {string} secret - The Uquid API secret key.
 * @returns {string} The generated hexadecimal signature.
 */
function generateSignature(requestBody, secret) {
  // Convert to JSON string (exactly as the API expects, like ping and test scripts)
  const params = JSON.stringify(requestBody);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(params)
    .digest("hex");

  return signature;
}

/**
 * Makes a request to the Uquid API (using ping-uquid.js and test-uquid.js method).
 * @param {object} requestBody - The body of the request.
 * @returns {Promise<object>} The response data from the API.
 */
async function makeUquidRequest(requestBody) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Check if API keys are configured
    if (!UQUID_API_KEY || !UQUID_API_SECRET) {
      throw new Error(
        "Uquid API credentials not configured. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
      );
    }

    const signature = generateSignature(requestBody, UQUID_API_SECRET);
    const url = `${UQUID_BASE_URL}?api_key=${UQUID_API_KEY}&signature=${signature}`;

    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 45000,
    });

    const duration = Date.now() - startTime;

    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[UQUID-${requestId}] API Error after ${duration}ms:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestAction: requestBody.action,
    });

    throw new Error(
      error.response?.data?.message || error.message || "API request failed"
    );
  }
}

/**
 * Makes a request to the Sha7nawy API.
 * @param {string} endpoint - The API endpoint (e.g., "/payment/create").
 * @param {object|null} requestBody - The body for POST requests.
 * @param {boolean} useSecretKey - Whether to use the secret key for authorization.
 * @returns {Promise<object>} The response data from the API.
 */
async function makeSha7nawyRequest(
  endpoint,
  requestBody = null,
  useSecretKey = false
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Check if API keys are configured
    if (!SHA7NAWY_PUBLIC_KEY || !SHA7NAWY_SECRET_KEY) {
      throw new Error(
        "Sha7nawy API credentials not configured. Please set SHA7NAWY_PUBLIC_KEY and SHA7NAWY_SECRET_KEY in your .env file"
      );
    }

    const url = `${SHA7NAWY_BASE_URL}${endpoint}`;
    const authKey = useSecretKey ? SHA7NAWY_SECRET_KEY : SHA7NAWY_PUBLIC_KEY;
    const headers = {
      Accept: "application/json",
      Authorization: authKey,
    };

    const options = {
      method: requestBody ? "POST" : "GET",
      headers,
      timeout: 30000,
    };

    if (requestBody) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`[SHA7NAWY-${requestId}] HTTP Error:`, {
        status: response.status,
        statusText: response.statusText,
        endpoint,
      });
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          errorData.message || "Unknown error"
        }`
      );
    }

    const responseData = await response.json();

    return responseData;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[SHA7NAWY-${requestId}] API request failed after ${duration}ms:`,
      {
        message: error.message,
        name: error.name,
        endpoint,
      }
    );

    throw new Error(error.message || "Sha7nawy API request failed");
  }
}

// --- API Routes ---

// 1. Create Sha7nawy payment request
app.post(
  "/api/payment/create",
  validatePhoneNumber,
  validateAmount,
  handleValidationErrors,
  async (req, res) => {
    const flowId = Math.random().toString(36).substring(7);
    const flowStartTime = Date.now();

    try {
      const { phoneNumber, amount } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({
          success: false,
          message: "Phone number and amount are required",
        });
      }
      if (!/^010[0-9]{8}$/.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Vodafone Egypt number format",
        });
      }
      if (amount < 5 || amount > 2000) {
        return res.status(400).json({
          success: false,
          message: "Top-up amount must be between 5 and 2000 EGP",
        });
      }

      // Calculate total amount with 12% service fee
      const topUpAmount = parseFloat(amount);
      const serviceFee = topUpAmount * 0.12; // 12% fee
      const totalAmount = topUpAmount + serviceFee;

      // Calculate API call splits for large amounts
      const apiCallSplits = calculateApiCallSplit(topUpAmount);

      // Check for products using the split amounts (Uquid product validation)

      const step1StartTime = Date.now();
      const productsResponse = await makeUquidRequest({
        action: "queryProductList",
        nonce: Math.round(Date.now() / 1000),
        params: { page: 1 },
      });

      if (!productsResponse.status || !productsResponse.data?.items) {
        throw new Error("Could not fetch product list from Uquid.");
      }

      const vodafoneProducts = productsResponse.data.items.filter(
        (p) =>
          p.name?.toLowerCase().includes("vodafone") &&
          p.name?.toLowerCase().includes("egypt")
      );

      if (vodafoneProducts.length === 0) {
        throw new Error("No Vodafone Egypt products found on Uquid.");
      }

      // Validate and get products for all splits
      const { selectedProducts, totalRequiredBalance } =
        await validateAndGetSplitProducts(apiCallSplits, vodafoneProducts);

      // Check if the balance in Uquid can afford the transaction
      const balanceResponse = await makeUquidRequest({
        action: "queryAccountBalance",
        nonce: Math.round(Date.now() / 1000),
      });

      if (!balanceResponse.status || !balanceResponse.data) {
        throw new Error("Could not fetch account balance from Uquid.");
      }

      // Extract USDT balance from the balance array
      const usdtBalance = balanceResponse.data.find((b) => b.symbol === "usdt");
      const availableBalance = usdtBalance
        ? parseFloat(usdtBalance.available)
        : 0;

      if (availableBalance < totalRequiredBalance) {
        throw new Error(
          `Insufficient balance. Available: ${availableBalance} USDT, Required: ${totalRequiredBalance} USD for ${topUpAmount} EGP top-up (${apiCallSplits.length} API calls)`
        );
      }

      // Start the Sha7nawy process
      const requestBody = {
        number: phoneNumber,
        amount: totalAmount,
        method: "vfcash",
        client: `User: ${phoneNumber}`,
        details: `Vodafone Egypt Top-up ${topUpAmount} EGP (+ ${serviceFee} EGP 12% service fee)`,
      };

      const response = await makeSha7nawyRequest(
        "/payment/create",
        requestBody
      );

      if (response.status && response.data) {
        res.json({
          success: true,
          message: `${response.message} - You will pay ${totalAmount} EGP (${topUpAmount} EGP top-up + ${serviceFee} EGP 12% service fee)`,
          reference: response.data.reference,
          paymentId: response.data.id, // Payment ID for status checking
          topUpAmount: topUpAmount,
          serviceFee: serviceFee,
          totalAmount: totalAmount,
          uquidProducts: selectedProducts, // Store all product info for later use (multiple products for splits)
          apiCallSplits: apiCallSplits, // Store split information
          totalRequiredBalance: totalRequiredBalance, // Store total balance required
          uquidBalance: availableBalance, // Store balance info for later use
        });
      } else {
        throw new Error(response.message || "Failed to create payment");
      }
    } catch (error) {
      const totalFlowDuration = Date.now() - flowStartTime;

      // Log detailed error context for debugging
      logger.error(`[PAYMENT-${flowId}] Payment flow error:`, {
        error: error.message,
        flowId,
        duration: totalFlowDuration,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(500).json({
        success: false,
        message: error.message,
        flowId,
        duration: totalFlowDuration,
      });
    }
  }
);

// 2. Confirm payment with Sha7nawy then check status with Get Payment Info API AND execute Uquid top-up
app.post(
  "/api/payment/check-and-process",
  validatePaymentData,
  handleValidationErrors,
  async (req, res) => {
    const { paymentId, reference } = req.body;
    if (!paymentId || !reference) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and reference are required",
      });
    }

    try {
      // --- STEP 1: ALWAYS run the confirm API first ---
      try {
        const confirmRequestBody = { ref_code: reference };
        await makeSha7nawyRequest(
          "/payment/confirm",
          confirmRequestBody,
          false // Use public key for confirm
        );
      } catch (confirmError) {
        // Continue with payment info check even if confirm fails
      }

      // Small delay to ensure proper API sequencing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // --- STEP 2: ALWAYS check actual payment status with Get Payment Info ---
      const sha7nawyResponse = await makeSha7nawyRequest(
        `/payment/${paymentId}`,
        null,
        true // Use secret key for payment info
      );

      if (!sha7nawyResponse.status || !sha7nawyResponse.data) {
        throw new Error(
          sha7nawyResponse.message || "Failed to get payment info from Sha7nawy"
        );
      }

      const paymentStatus = sha7nawyResponse.data.status?.toLowerCase();

      // Check if payment is completed successfully
      if (
        paymentStatus === "completed" ||
        paymentStatus === "success" ||
        paymentStatus === "paid"
      ) {
        // Payment completed successfully
      } else if (
        paymentStatus === "rejected" ||
        paymentStatus === "failed" ||
        paymentStatus === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: `Payment was ${paymentStatus}. Transaction stopped.`,
          paymentStatus: paymentStatus,
        });
      } else if (
        paymentStatus === "pending" ||
        paymentStatus === "processing"
      ) {
        return res.status(202).json({
          success: false,
          message: `Payment is still ${paymentStatus}. Please wait and try again.`,
          paymentStatus: paymentStatus,
          shouldRetry: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Unknown payment status: ${paymentStatus}`,
          paymentStatus: paymentStatus,
        });
      }

      const { amount: totalPaidAmount, number: phoneNumber } =
        sha7nawyResponse.data;

      // Calculate the original top-up amount (excluding 12% service fee)
      const topUpAmount = parseFloat(totalPaidAmount) / 1.12; // Remove 12% fee
      const serviceFee = parseFloat(totalPaidAmount) - topUpAmount;

      // After confirmation from Sha7nawy, process multiple orders from Uquid
      // Recalculate splits and get products for confirmed payment
      const apiCallSplits = calculateApiCallSplit(topUpAmount);

      const productsResponse = await makeUquidRequest({
        action: "queryProductList",
        nonce: Math.round(Date.now() / 1000),
        params: { page: 1 },
      });

      if (!productsResponse.status || !productsResponse.data?.items) {
        throw new Error("Could not fetch product list from Uquid.");
      }

      const vodafoneProducts = productsResponse.data.items.filter(
        (p) =>
          p.name?.toLowerCase().includes("vodafone") &&
          p.name?.toLowerCase().includes("egypt")
      );

      if (vodafoneProducts.length === 0) {
        throw new Error("No Vodafone Egypt products found on Uquid.");
      }

      // Validate and get products for all splits
      const { selectedProducts } = await validateAndGetSplitProducts(
        apiCallSplits,
        vodafoneProducts
      );

      // Format phone number for Uquid (remove leading 0 and add Egypt country code)
      const cleanPhone = phoneNumber.replace(/\D/g, ""); // Remove all non-digit characters

      let formattedPhone;
      if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
        // Egyptian mobile number starting with 01 (11 digits)
        formattedPhone = `20${cleanPhone.substring(1)}`; // Convert 01xxxxxxxx to 201xxxxxxxx
      } else if (cleanPhone.startsWith("201") && cleanPhone.length === 13) {
        // Already in international format
        formattedPhone = cleanPhone;
      } else if (cleanPhone.startsWith("1") && cleanPhone.length === 10) {
        // Missing leading 0, add country code
        formattedPhone = `201${cleanPhone}`;
      } else {
        // Use as-is and let the API handle it
        formattedPhone = cleanPhone;
      }

      // Submit multiple orders based on splits
      const orderResults = [];

      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        const split = apiCallSplits[i];

        for (let j = 0; j < split.count; j++) {
          const submitOrderBody = {
            action: "submitOrder",
            nonce: Math.round(Date.now() / 1000),
            params: {
              _order_product_id: product.id,
              _order_coin: "usdt",
              _order_mode: "live",
              _order_quantity: "1",
              _order_value: Math.round(split.amount).toString(),
              _order_force_mode: "live",
              mobile_number: formattedPhone,
            },
          };

          const uquidSubmitResponse = await makeUquidRequest(submitOrderBody);

          if (
            !uquidSubmitResponse.status ||
            !uquidSubmitResponse.data.batch_id
          ) {
            throw new Error(
              `Failed to submit Uquid order ${orderResults.length + 1}: ${
                uquidSubmitResponse.message || "Unknown error"
              }`
            );
          }

          const batchId = uquidSubmitResponse.data.batch_id;
          orderResults.push({
            batchId,
            amount: split.amount,
            productName: product.name,
            submitResponse: uquidSubmitResponse.data,
          });

          // Add delay between orders (500ms)
          if (
            orderResults.length <
            selectedProducts.reduce((total, p) => total + p.requestedCount, 0)
          ) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // Confirm all orders
      const confirmationResults = [];

      for (let i = 0; i < orderResults.length; i++) {
        const order = orderResults[i];

        const confirmOrderBody = {
          action: "confirmOrder",
          nonce: Math.round(Date.now() / 1000),
          params: { batch_id: order.batchId },
        };

        try {
          const confirmResponse = await makeUquidRequest(confirmOrderBody);
          confirmationResults.push({
            batchId: order.batchId,
            amount: order.amount,
            confirmed: confirmResponse.status,
            response: confirmResponse.data,
          });

          // Order confirmation status is tracked in confirmationResults
        } catch (error) {
          confirmationResults.push({
            batchId: order.batchId,
            amount: order.amount,
            confirmed: false,
            error: error.message,
          });
        }

        // Add delay between confirmations (500ms)
        if (i < orderResults.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      res.json({
        success: true,
        message: "Top-up successful!",
        sha7nawyTransaction: sha7nawyResponse.data,
        uquidOrders: orderResults, // Array of all order results
        confirmationResults: confirmationResults, // Array of all confirmation results
        uquidOrder: orderResults[0]
          ? {
              // For frontend compatibility, provide first order
              batch_id: orderResults[0].batchId,
              status: "processing",
            }
          : null,
        transaction: {
          topUpAmount: Math.round(topUpAmount * 100) / 100, // Round to 2 decimal places
          serviceFee: Math.round(serviceFee * 100) / 100,
          totalPaid: parseFloat(totalPaidAmount),
          phoneNumber: phoneNumber,
          totalOrders: orderResults.length,
          totalConfirmed: confirmationResults.filter((c) => c.confirmed).length,
        },
      });
    } catch (error) {
      logger.error("[TRANSACTION] Failed:", {
        error: error.message,
        paymentId,
        reference,
      });
      logTransaction(
        "uquid_topup",
        { paymentId, reference, error: error.message },
        false
      );
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get payment information
app.get("/api/payment/info/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const response = await makeSha7nawyRequest(
      `/payment/${transactionId}`,
      null,
      true
    );

    if (response.status && response.data) {
      res.json({
        success: true,
        payment: response.data,
        message: response.message,
      });
    } else {
      throw new Error(response.message || "Failed to get payment info");
    }
  } catch (error) {
    logger.error("[SHA7NAWY] Error getting payment info:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment info",
    });
  }
});

// Uquid API Routes

// Get Vodafone products
app.get("/api/vodafone/products", async (req, res) => {
  try {
    let allVodafoneProducts = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages && page <= 10) {
      // Limit to 10 pages max
      const requestBody = {
        action: "queryProductList",
        nonce: Math.round(new Date().getTime() / 1000),
        params: {
          page: page,
        },
      };

      const response = await makeUquidRequest(requestBody);

      if (response.status && response.data && response.data.products) {
        const vodafoneProducts = response.data.products.filter((product) => {
          const name = product.name?.toLowerCase() || "";
          const category = product.category?.toLowerCase() || "";

          return (
            (name.includes("vodafone") && name.includes("egypt")) ||
            (category.includes("vodafone") && category.includes("egypt")) ||
            name.includes("vodafone eg") ||
            name.includes("vf egypt")
          );
        });

        allVodafoneProducts.push(...vodafoneProducts);

        // Check if there are more pages
        hasMorePages = response.data.products.length > 0;
        page++;
      } else {
        hasMorePages = false;
      }
    }

    res.json({
      success: true,
      products: allVodafoneProducts,
      total: allVodafoneProducts.length,
    });
  } catch (error) {
    logger.error("[UQUID] Error fetching products:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Vodafone products",
    });
  }
});

// Submit Vodafone order (now only after payment confirmation)
app.post("/api/vodafone/submit-order", async (req, res) => {
  try {
    const {
      phoneNumber,
      amount,
      mode = "preview",
      paymentReference,
    } = req.body;

    // Validate input
    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone number and amount are required",
      });
    }

    // For live orders, require payment reference
    if (mode === "live" && !paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required for live orders",
      });
    }

    // Validate Vodafone Egypt number
    const vodafoneRegex = /^010[0-9]{8}$/;
    const cleanPhone = phoneNumber.replace(/\s+/g, "");
    if (!vodafoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vodafone Egypt number format",
      });
    }

    // Validate amount
    if (amount < 5 || amount > 2000) {
      return res.status(400).json({
        success: false,
        message: "Amount must be between 5 and 2000 EGP",
      });
    }

    // Get Vodafone products
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? `${req.protocol}://${req.get("host")}`
        : `http://localhost:${PORT}`;
    const productsResponse = await axios.get(
      `${baseUrl}/api/vodafone/products`
    );
    const products = productsResponse.data.products || [];

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Vodafone Egypt products available",
      });
    }

    // Find suitable product
    let selectedProduct = null;
    let selectedDenomination = null;

    // Try to find exact amount match
    for (const product of products) {
      if (product.denominations) {
        const exactDenom = product.denominations.find(
          (denom) => parseFloat(denom.value) === parseFloat(amount)
        );
        if (exactDenom) {
          selectedProduct = product;
          selectedDenomination = exactDenom;
          break;
        }
      }
    }

    // If no exact match, find variable amount product
    if (!selectedProduct) {
      for (const product of products) {
        if (
          product.type === "variable" ||
          (product.denominations &&
            product.denominations.some(
              (denom) => denom.min_value <= amount && denom.max_value >= amount
            ))
        ) {
          selectedProduct = product;
          selectedDenomination = product.denominations
            ? product.denominations.find(
                (denom) =>
                  denom.min_value <= amount && denom.max_value >= amount
              )
            : null;
          break;
        }
      }
    }

    // If still no product, use the first available one (assuming it supports variable amounts)
    if (!selectedProduct && products.length > 0) {
      selectedProduct = products[0];
      selectedDenomination = selectedProduct.denominations
        ? selectedProduct.denominations[0]
        : null;
    }

    if (!selectedProduct) {
      return res.status(404).json({
        success: false,
        message: `No suitable Vodafone product found for amount ${amount} EGP`,
      });
    }

    // Submit order to Uquid
    const requestBody = {
      action: "submitOrder",
      nonce: Math.round(new Date().getTime() / 1000),
      params: {
        _order_product_id: selectedProduct.id,
        _order_coin: "usdt", // Using USDT instead of UQC
        _order_mode: mode,
        _order_quantity: 1,
        _order_value: parseFloat(amount),
        _order_recipient: cleanPhone, // Phone number for mobile top-up
      },
    };

    const response = await makeUquidRequest(requestBody);

    if (response.status && response.data) {
      res.json({
        success: true,
        order: response.data,
        product: selectedProduct,
        denomination: selectedDenomination,
      });
    } else {
      throw new Error(response.message || "Failed to submit order");
    }
  } catch (error) {
    logger.error("[UQUID] Error submitting order:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit order",
    });
  }
});

// Confirm order
app.post("/api/vodafone/confirm-order", async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "Batch ID is required",
      });
    }

    const requestBody = {
      action: "confirmOrder",
      nonce: Math.round(new Date().getTime() / 1000),
      params: {
        batch_id: batchId,
      },
    };

    const response = await makeUquidRequest(requestBody);

    if (response.status && response.data) {
      res.json({
        success: true,
        order: response.data,
      });
    } else {
      throw new Error(response.message || "Failed to confirm order");
    }
  } catch (error) {
    logger.error("[UQUID] Error confirming order:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm order",
    });
  }
});

// Check order status
app.get("/api/vodafone/order-status/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const requestBody = {
      action: "checkOrder",
      nonce: Math.round(new Date().getTime() / 1000),
      params: {
        batch_id: batchId,
      },
    };

    const response = await makeUquidRequest(requestBody);

    if (response.status && response.data) {
      res.json({
        success: true,
        order: response.data,
      });
    } else {
      throw new Error(response.message || "Failed to check order status");
    }
  } catch (error) {
    logger.error("[UQUID] Error checking order status:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check order status",
    });
  }
});

// Get account balance
app.get("/api/account/balance", async (req, res) => {
  try {
    const requestBody = {
      action: "queryAccountBalance",
      nonce: Math.round(new Date().getTime() / 1000),
    };

    const response = await makeUquidRequest(requestBody);

    if (response.status && response.data) {
      res.json({
        success: true,
        balance: response.data,
      });
    } else {
      throw new Error(response.message || "Failed to get account balance");
    }
  } catch (error) {
    logger.error("[UQUID] Error getting account balance:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get account balance",
    });
  }
});

// Check Uquid product availability for a specific amount
app.get("/api/uquid/products/check/:amount", async (req, res) => {
  try {
    const { amount } = req.params;
    const topUpAmount = parseFloat(amount);

    if (isNaN(topUpAmount) || topUpAmount < 5 || topUpAmount > 2000) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Must be between 5 and 2000 EGP",
      });
    }

    const productsResponse = await makeUquidRequest({
      action: "queryProductList",
      nonce: Math.round(Date.now() / 1000),
      params: { page: 1 },
    });

    if (!productsResponse.status || !productsResponse.data?.items) {
      throw new Error("Could not fetch product list from Uquid.");
    }

    const vodafoneProducts = productsResponse.data.items.filter(
      (p) =>
        p.name?.toLowerCase().includes("vodafone") &&
        p.name?.toLowerCase().includes("egypt")
    );

    const selectedProduct = vodafoneProducts.find(
      (p) => p.extra?.range?.currentFace === topUpAmount
    );

    res.json({
      success: true,
      available: !!selectedProduct,
      product: selectedProduct || null,
      amount: topUpAmount,
      totalProducts: vodafoneProducts.length,
    });
  } catch (error) {
    logger.error("[UQUID] Error checking product availability:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check product availability",
    });
  }
});

// Health check with comprehensive status
app.get("/api/health", async (req, res) => {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    memory: process.memoryUsage(),
    version: "1.0.0",
    services: {
      uquid: false,
      sha7nawy: false,
    },
  };

  // Check external services
  try {
    // Test Uquid API
    const uquidTest = await makeUquidRequest({
      action: "queryAccountBalance",
      nonce: Math.round(Date.now() / 1000),
    });
    healthData.services.uquid = uquidTest.status || false;
  } catch (error) {
    logger.warn("Uquid health check failed:", error.message);
  }

  try {
    // Test Sha7nawy API (basic connectivity)
    const sha7nawyTest = await fetch(`${SHA7NAWY_BASE_URL}/health`, {
      method: "GET",
      timeout: 5000,
    });
    healthData.services.sha7nawy = sha7nawyTest.ok;
  } catch (error) {
    logger.warn("Sha7nawy health check failed:", error.message);
  }

  const allServicesHealthy = Object.values(healthData.services).every(Boolean);
  if (!allServicesHealthy) {
    healthData.status = "degraded";
  }

  res.status(allServicesHealthy ? 200 : 503).json(healthData);
});

// Serve React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(7);

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
    NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
    errorId,
    timestamp: new Date().toISOString(),
    ...(NODE_ENV !== "production" && {
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

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      logger.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
    logger.info("Server closed successfully");
    process.exit(0);
  });
};

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [SERVER] === APPLICATION STARTUP COMPLETED ===`);
  console.log(`🌐 [SERVER] Running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(
    `🔑 [UQUID] API Key: ${UQUID_API_KEY ? "✅ Loaded" : "❌ Missing"}`
  );
  console.log(
    `🔑 [SHA7NAWY] Public Key: ${
      SHA7NAWY_PUBLIC_KEY ? "✅ Loaded" : "❌ Missing"
    }`
  );
  console.log(
    `🔑 [SHA7NAWY] Secret Key: ${
      SHA7NAWY_SECRET_KEY ? "✅ Loaded" : "❌ Missing"
    }`
  );

  if (NODE_ENV === "production") {
    console.log(`⚡ [SERVER] Production optimizations enabled`);
  } else {
    console.log(`🛠️ [SERVER] Development mode - Enhanced debugging enabled`);
  }

  console.log(
    `📡 [SERVER] API endpoints available at http://localhost:${PORT}/api/`
  );
  console.log(`💻 [SERVER] Frontend served at http://localhost:${PORT}/`);
  console.log(
    `🏥 [SERVER] Health check at http://localhost:${PORT}/api/health`
  );

  logger.info(`[SERVER] Running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`[UQUID] API Key: ${UQUID_API_KEY ? "Loaded" : "Missing"}`);
  logger.info(
    `[SHA7NAWY] Public Key: ${SHA7NAWY_PUBLIC_KEY ? "Loaded" : "Missing"}`
  );

  if (NODE_ENV === "production") {
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

export default app;
