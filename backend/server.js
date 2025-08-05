import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
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

// --- Helper Functions ---

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
  try {
    const signature = generateSignature(requestBody, UQUID_API_SECRET);
    const url = `${UQUID_BASE_URL}?api_key=${UQUID_API_KEY}&signature=${signature}`;

    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 45000,
    });

    return response.data;
  } catch (error) {
    console.error(`[UQUID] API Error:`, error.response?.data || error.message);
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
  const url = `${SHA7NAWY_BASE_URL}${endpoint}`;
  const headers = {
    Accept: "application/json",
    Authorization: useSecretKey ? SHA7NAWY_SECRET_KEY : SHA7NAWY_PUBLIC_KEY,
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

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[SHA7NAWY] API Error:", errorData);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          errorData.message || "Unknown error"
        }`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("[SHA7NAWY] API request failed:", error.message);
    throw new Error(error.message || "Sha7nawy API request failed");
  }
}

// --- API Routes ---

// 1. Create Sha7nawy payment request
app.post("/api/payment/create", async (req, res) => {
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
    if (amount < 5 || amount > 1000) {
      return res.status(400).json({
        success: false,
        message: "Top-up amount must be between 5 and 1000 EGP",
      });
    }

    // Calculate total amount with 20% service fee
    const topUpAmount = parseFloat(amount);
    const serviceFee = topUpAmount * 0.2; // 20% fee
    const totalAmount = topUpAmount + serviceFee;

    console.log(
      `[SHA7NAWY] Creating payment: ${phoneNumber} - ${totalAmount} EGP`
    );

    const requestBody = {
      number: phoneNumber,
      amount: totalAmount,
      method: "vfcash",
      client: `User: ${phoneNumber}`,
      details: `Vodafone Egypt Top-up ${topUpAmount} EGP (+ ${serviceFee} EGP fee)`,
    };

    const response = await makeSha7nawyRequest("/payment/create", requestBody);
    if (response.status && response.data) {
      console.log(
        `[SHA7NAWY] Payment created. Ref: ${response.data.reference}`
      );
      res.json({
        success: true,
        message: `${response.message} - You will pay ${totalAmount} EGP (${topUpAmount} EGP top-up + ${serviceFee} EGP service fee)`,
        reference: response.data.reference,
        paymentId: response.data.id, // Payment ID for status checking
        topUpAmount: topUpAmount,
        serviceFee: serviceFee,
        totalAmount: totalAmount,
      });
    } else {
      throw new Error(response.message || "Failed to create payment");
    }
  } catch (error) {
    console.error("[SHA7NAWY] Error creating payment:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Confirm payment with Sha7nawy then check status with Get Payment Info API AND execute Uquid top-up
app.post("/api/payment/check-and-process", async (req, res) => {
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
      console.log(`[SHA7NAWY] Confirm API successful`);
    } catch (confirmError) {
      console.error(
        `[SHA7NAWY] Confirm API failed (continuing anyway):`,
        confirmError.message
      );
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
    console.log(`[SHA7NAWY] Payment status: ${paymentStatus}`);

    // Check if payment is completed successfully
    if (
      paymentStatus === "completed" ||
      paymentStatus === "success" ||
      paymentStatus === "paid"
    ) {
      console.log("[SHA7NAWY] Payment completed successfully");
    } else if (
      paymentStatus === "rejected" ||
      paymentStatus === "failed" ||
      paymentStatus === "cancelled"
    ) {
      console.log(`[SHA7NAWY] Payment was ${paymentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Payment was ${paymentStatus}. Transaction stopped.`,
        paymentStatus: paymentStatus,
      });
    } else if (paymentStatus === "pending" || paymentStatus === "processing") {
      console.log(`[SHA7NAWY] Payment is still ${paymentStatus}`);
      return res.status(202).json({
        success: false,
        message: `Payment is still ${paymentStatus}. Please wait and try again.`,
        paymentStatus: paymentStatus,
        shouldRetry: true,
      });
    } else {
      console.log(`[SHA7NAWY] Unknown payment status: ${paymentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Unknown payment status: ${paymentStatus}`,
        paymentStatus: paymentStatus,
      });
    }

    const { amount: totalPaidAmount, number: phoneNumber } =
      sha7nawyResponse.data;

    // Calculate the original top-up amount (excluding 20% service fee)
    const topUpAmount = parseFloat(totalPaidAmount) / 1.2; // Remove 20% fee
    const serviceFee = parseFloat(totalPaidAmount) - topUpAmount;

    console.log(`[UQUID] Processing top-up: ${topUpAmount} EGP`);

    const productsResponse = await makeUquidRequest({
      action: "queryProductList",
      nonce: Math.round(Date.now() / 1000),
      params: { page: 1 }, // Fetching the first page is usually enough
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

    // **CORRECTED LOGIC:** Find the product with the exact face value.
    const selectedProduct = vodafoneProducts.find(
      (p) => p.extra?.range?.currentFace === topUpAmount
    );

    if (!selectedProduct) {
      throw new Error(
        `No suitable Uquid product found for amount ${topUpAmount} EGP.`
      );
    }
    console.log(`[UQUID] Selected product: ${selectedProduct.name}`);

    // --- STEP 3: Submit the order to Uquid ---

    // Format phone number for Uquid (remove leading 0 and add Egypt country code)
    // Clean the phone number first (remove any spaces, dashes, etc.)
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

    const submitOrderBody = {
      action: "submitOrder",
      nonce: Math.round(Date.now() / 1000),
      params: {
        _order_product_id: selectedProduct.id,
        _order_coin: "usdt", // Using USDT instead of UQC
        _order_mode: "live", // This is a real purchase
        _order_quantity: "1", // Convert to string
        _order_value: Math.round(topUpAmount).toString(), // Ensure integer value as string
        _order_force_mode: "live", // Add required force mode parameter
        mobile_number: formattedPhone, // Use formatted international number
      },
    };

    const uquidSubmitResponse = await makeUquidRequest(submitOrderBody);

    if (!uquidSubmitResponse.status || !uquidSubmitResponse.data.batch_id) {
      throw new Error(
        uquidSubmitResponse.message || "Failed to submit Uquid order."
      );
    }
    const batchId = uquidSubmitResponse.data.batch_id;
    console.log(`[UQUID] Order submitted. Batch ID: ${batchId}`);

    // --- STEP 4: Confirm the order with Uquid ---
    const confirmOrderBody = {
      action: "confirmOrder",
      nonce: Math.round(Date.now() / 1000),
      params: { batch_id: batchId },
    };

    const uquidConfirmResponse = await makeUquidRequest(confirmOrderBody);

    if (!uquidConfirmResponse.status) {
      console.warn(
        `[UQUID] Order confirmation may have failed. Batch ID: ${batchId}`
      );
    }

    console.log("[UQUID] Top-up successful");
    res.json({
      success: true,
      message: "Top-up successful!",
      sha7nawyTransaction: sha7nawyResponse.data,
      uquidOrder: uquidConfirmResponse.data || {
        batch_id: batchId,
        status: "processing",
      },
      transaction: {
        topUpAmount: Math.round(topUpAmount * 100) / 100, // Round to 2 decimal places
        serviceFee: Math.round(serviceFee * 100) / 100,
        totalPaid: parseFloat(totalPaidAmount),
        phoneNumber: phoneNumber,
      },
    });
  } catch (error) {
    console.error("[TRANSACTION] Failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
    console.error("[SHA7NAWY] Error getting payment info:", error);
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
    console.error("[UQUID] Error fetching products:", error);
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
    if (amount < 5 || amount > 1000) {
      return res.status(400).json({
        success: false,
        message: "Amount must be between 5 and 1000 EGP",
      });
    }

    // Get Vodafone products
    const productsResponse = await axios.get(
      `http://localhost:${PORT}/api/vodafone/products`
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
    console.error("[UQUID] Error submitting order:", error);
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
    console.error("[UQUID] Error confirming order:", error);
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
    console.error("[UQUID] Error checking order status:", error);
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
    console.error("[UQUID] Error getting account balance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get account balance",
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// Serve React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res) => {
  console.error("[SERVER] Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[UQUID] API Key: ${UQUID_API_KEY ? "Loaded" : "Missing"}`);
  console.log(
    `[SHA7NAWY] Public Key: ${SHA7NAWY_PUBLIC_KEY ? "Loaded" : "Missing"}`
  );
});

export default app;
