import express from "express";
import {
  validatePhoneNumber,
  validateAmount,
  handleValidationErrors,
} from "../middleware/security.js";
import logger, { logTransaction } from "../middleware/logger.js";
import kashierService from "../services/kashierService.js";
import uquidService from "../services/uquidService.js";
import {
  calculateApiCallSplit,
  validateAndGetSplitProducts,
  calculateServiceFee,
  extractTopUpAmount,
  formatPhoneForUquid,
  generateFlowId,
  maskPhoneNumber,
  isValidVodafoneNumber,
  isValidAmount,
} from "../utils/index.js";
import { KASHIER_CONFIG, FRONTEND_CONFIG } from "../config/index.js";

const router = express.Router();

// In-memory storage for payment sessions (in production, use database)
const paymentSessions = new Map();
const processingLocks = new Set(); // Prevent duplicate processing

/**
 * Create Kashier payment session
 */
router.post(
  "/create-session",
  validatePhoneNumber,
  validateAmount,
  handleValidationErrors,
  async (req, res) => {
    const flowId = generateFlowId();
    const flowStartTime = Date.now();

    try {
      const { phoneNumber, amount } = req.body;

      logger.info(`[KASHIER-${flowId}] 🚀 Creating payment session:`, {
        flowId,
        phoneNumber: maskPhoneNumber(phoneNumber),
        amount,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date().toISOString(),
      });

      // Validate required fields
      if (!phoneNumber || !amount) {
        return res.status(400).json({
          success: false,
          message: "Phone number and amount are required",
          flowId,
        });
      }

      // Validate phone number format
      if (!isValidVodafoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number format (must be Vodafone Egypt)",
          flowId,
        });
      }

      // Validate amount
      if (!isValidAmount(amount)) {
        return res.status(400).json({
          success: false,
          message: "Top-up amount must be between 8 and 2000 EGP",
        });
      }

      // Calculate amounts
      const { topUpAmount, serviceFee, totalAmount } =
        calculateServiceFee(amount);

      logger.info(`[KASHIER-${flowId}] 💰 Amount calculations:`, {
        originalAmount: amount,
        topUpAmount,
        serviceFee,
        totalAmount,
      });

      // Generate unique order ID
      const orderId = `ORDER_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      // Build URLs with fallback for development
      const baseUrl = req.get("host")
        ? `${req.protocol}://${req.get("host")}`
        : "http://localhost:3001";

      const merchantRedirectUrl = `${baseUrl}/api/kashier/redirect`;
      const serverWebhookUrl = `${baseUrl}/api/kashier/webhook`;

      logger.info(`[KASHIER-${flowId}] 🔗 URLs generated:`, {
        baseUrl,
        merchantRedirectUrl,
        serverWebhookUrl,
        protocol: req.protocol,
        host: req.get("host"),
      });

      // Prepare payment data for Kashier
      const paymentData = {
        amount: totalAmount,
        currency: "EGP",
        orderId,
        merchantRedirect: merchantRedirectUrl,
        serverWebhook: serverWebhookUrl,
        description: `شحن رصيد فودافون - ${topUpAmount} جنيه`,
        customer: {
          email: "customer@example.com", // You can collect this from user
          reference: phoneNumber,
        },
        metaData: {
          phoneNumber,
          topUpAmount,
          serviceFee,
          flowId,
        },
      };

      // Create Kashier payment session
      const sessionResult = await kashierService.createPaymentSession(
        paymentData
      );

      // Store session data for later processing
      paymentSessions.set(sessionResult._id, {
        sessionId: sessionResult._id,
        orderId,
        phoneNumber,
        topUpAmount,
        serviceFee,
        totalAmount,
        flowId,
        created: new Date().toISOString(),
        status: "pending",
      });

      logger.info(`[KASHIER-${flowId}] ✅ Payment session created:`, {
        sessionId: sessionResult._id,
        sessionUrl: sessionResult.sessionUrl,
        orderId,
      });

      res.json({
        success: true,
        message: "Payment session created successfully",
        sessionId: sessionResult._id,
        sessionUrl: sessionResult.sessionUrl,
        orderId,
        amount: totalAmount,
        flowId,
      });
    } catch (error) {
      const totalFlowDuration = Date.now() - flowStartTime;

      logger.error(`[KASHIER-${flowId}] Payment session creation error:`, {
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

/**
 * Kashier webhook endpoint
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-kashier-signature"];

    if (!signature) {
      logger.error("[KASHIER-WEBHOOK] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    logger.info("[KASHIER-WEBHOOK] Received webhook:", {
      body: req.body,
      signature: signature.substring(0, 10) + "...",
    });

    // Validate webhook signature
    const { data, event } = kashierService.validateWebhook(req.body, signature);

    // Process based on event type
    if (event === "pay" && data.status === "SUCCESS") {
      await processSuccessfulPayment(data);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("[KASHIER-WEBHOOK] Webhook processing error:", {
      error: error.message,
      body: req.body,
    });

    // Still respond with 200 to prevent retries
    res.status(200).json({ error: error.message });
  }
});

/**
 * Kashier redirect endpoint
 */
router.get("/redirect", async (req, res) => {
  try {
    const { paymentStatus, merchantOrderId, signature, mode } = req.query;

    logger.info("[KASHIER-REDIRECT] Payment redirect received:", {
      paymentStatus,
      merchantOrderId,
      mode,
      hasSignature: !!signature,
    });

    // Validate signature if present
    if (signature) {
      const isValid = kashierService.validateSignature(req.query);
      if (!isValid) {
        logger.error("[KASHIER-REDIRECT] Invalid signature");
        return res.redirect(FRONTEND_CONFIG.URL + "/?error=invalid_signature");
      }
    }

    if (paymentStatus === "SUCCESS") {
      // Process successful payment (non-blocking)
      processSuccessfulPayment({
        merchantOrderId,
        status: "SUCCESS",
        transactionId: req.query.transactionId,
        amount: req.query.amount,
        currency: req.query.currency,
      }).catch((error) => {
        logger.error("[KASHIER-REDIRECT] Error processing payment:", error);
      });

      // Always redirect immediately to frontend
      res.redirect(
        FRONTEND_CONFIG.URL + "/?success=true&orderId=" + merchantOrderId
      );
    } else {
      // Payment failed
      logger.warn("[KASHIER-REDIRECT] Payment failed:", {
        paymentStatus,
        merchantOrderId,
      });

      res.redirect(
        FRONTEND_CONFIG.URL +
          "/?error=payment_failed&orderId=" +
          merchantOrderId
      );
    }
  } catch (error) {
    logger.error("[KASHIER-REDIRECT] Redirect processing error:", {
      error: error.message,
      query: req.query,
    });

    res.redirect(FRONTEND_CONFIG.URL + "/?error=processing_error");
  }
});

/**
 * Get payment session status
 */
router.get("/session/:sessionId/status", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session from Kashier
    const sessionStatus = await kashierService.getPaymentSessionStatus(
      sessionId
    );

    // Get local session data
    const localSession = paymentSessions.get(sessionId);

    res.json({
      success: true,
      sessionStatus: sessionStatus.data,
      localSession,
      sessionId,
    });
  } catch (error) {
    logger.error("[KASHIER-SESSION] Status check error:", {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Serve Kashier iframe from backend (bypass CSP issues)
 */
router.get("/iframe/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session data
    let sessionData = null;
    for (const [id, session] of paymentSessions.entries()) {
      if (id === sessionId) {
        sessionData = session;
        break;
      }
    }

    if (!sessionData) {
      return res.status(404).send("Payment session not found");
    }

    const { orderId, topUpAmount, phoneNumber } = sessionData;

    // Create the iframe HTML page
    const iframeHTML = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>دفع آمن - Kashier</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }
        
        .payment-container {
            display: flex;
            height: 100vh;
            width: 100vw;
            background: white;
            overflow: hidden;
        }
        
        .payment-sidebar {
            width: 300px;
            min-width: 300px;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
        }
        
        .payment-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .payment-header h1 {
            font-size: 20px;
            margin-bottom: 8px;
        }
        
        .payment-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .payment-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .info-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .info-label {
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            font-size: 13px;
        }
        
        .info-value {
            color: white;
            font-weight: 600;
            font-size: 14px;
        }
        
        .amount-highlight {
            color: #fef3c7;
            font-size: 16px;
            font-weight: 700;
        }
        
        .security-badge-sidebar {
            margin-top: 20px;
            text-align: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .security-badge-sidebar span {
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            font-weight: 500;
        }
        
        .iframe-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        .loading-spinner {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
            transition: opacity 0.3s ease;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f4f6;
            border-top: 3px solid #dc2626;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-text {
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
        }
        

        
        .kashier-iframe {
            width: 100%;
            height: 100vh;
            border: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .payment-container {
                flex-direction: column;
            }
            
            .payment-sidebar {
                width: 100%;
                min-width: unset;
                height: auto;
                max-height: 250px;
                padding: 15px;
                justify-content: flex-start;
            }
            
            .payment-header {
                margin-bottom: 15px;
            }
            
            .payment-header h1 {
                font-size: 18px;
                margin-bottom: 5px;
            }
            
            .payment-header p {
                font-size: 12px;
            }
            
            .payment-info {
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .info-row {
                margin-bottom: 8px;
                padding: 5px 0;
            }
            
            .info-label {
                font-size: 12px;
            }
            
            .info-value {
                font-size: 13px;
            }
            
            .amount-highlight {
                font-size: 14px;
            }
            
            .security-badge-sidebar {
                margin-top: 10px;
                padding: 10px;
            }
            
            .security-badge-sidebar span {
                font-size: 11px;
            }
            
            .iframe-container {
                flex: 1;
                min-height: calc(100vh - 250px);
            }
        }
        
        @media (max-width: 480px) {
            .payment-sidebar {
                max-height: 200px;
                padding: 10px;
            }
            
            .payment-header h1 {
                font-size: 16px;
            }
            
            .payment-info {
                padding: 10px;
            }
            
            .iframe-container {
                min-height: calc(100vh - 200px);
            }
        }
    </style>
</head>
<body>
    <div class="payment-container">
        <div class="payment-sidebar">
            <div class="payment-header">
                <h1>🔒 دفع آمن</h1>
                <p>شحن رصيد فودافون عبر Kashier</p>
            </div>
            
            <div class="payment-info">
                <div class="info-row">
                    <span class="info-label">رقم الطلب:</span>
                    <span class="info-value">${orderId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">رقم الهاتف:</span>
                    <span class="info-value">${phoneNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">مبلغ الشحن:</span>
                    <span class="amount-highlight">${topUpAmount} جنيه</span>
                </div>
            </div>
            
            <div class="security-badge-sidebar">
                <span>🛡️ مدفوعات آمنة ومشفرة عبر Kashier</span>
            </div>
        </div>
        
        <div class="iframe-container">
            <div class="loading-spinner" id="loadingSpinner">
                <div class="spinner"></div>
                <div class="loading-text">جاري تحميل صفحة الدفع الآمنة...</div>
            </div>
            
            <iframe 
                id="kashierIframe"
                class="kashier-iframe"
                src="https://payments.kashier.io/session/${sessionId}?mode=${
      process.env.KASHIER_MODE || "test"
    }"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            ></iframe>
        </div>
    </div>

    <script>
        let loadingHidden = false;
        
        function hideLoadingSpinner() {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner && !loadingHidden) {
                spinner.style.opacity = '0';
                setTimeout(function() {
                    spinner.style.display = 'none';
                }, 300);
                loadingHidden = true;
            }
        }
        
        function handleIframeError() {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.innerHTML = 
                    '<div style="color: #dc2626; text-align: center;"><div style="font-size: 40px; margin-bottom: 15px;">❌</div><div>خطأ في تحميل صفحة الدفع<br><small>يرجى المحاولة مرة أخرى</small></div></div>';
            }
        }
        
        // Add event listeners to iframe after DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            const iframe = document.getElementById('kashierIframe');
            if (iframe) {
                iframe.addEventListener('load', hideLoadingSpinner);
                iframe.addEventListener('error', handleIframeError);
            }
        });
        
        // Auto-hide loading after maximum timeout to improve UX
        setTimeout(function() {
            if (!loadingHidden) {
                console.log('Force hiding loading spinner after timeout');
                hideLoadingSpinner();
            }
        }, 8000); // 8 seconds max loading
        
        // Listen for messages from Kashier iframe
        window.addEventListener('message', function(event) {
            if (event.origin.includes('kashier.io')) {
                console.log('Kashier message:', event.data);
                
                // Hide loading when iframe is ready
                hideLoadingSpinner();
                
                // Handle payment completion
                if (event.data.type === 'payment_success') {
                    window.location.href = '${
                      FRONTEND_CONFIG.URL
                    }/?success=true&orderId=${orderId}';
                } else if (event.data.type === 'payment_error') {
                    window.location.href = '${
                      FRONTEND_CONFIG.URL
                    }/?error=payment_failed&orderId=${orderId}';
                }
            }
        });
        
        // Session timeout after 10 minutes
        setTimeout(function() {
            console.log('Payment session timeout');
            window.location.href = '${
              FRONTEND_CONFIG.URL
            }/?error=payment_timeout&orderId=${orderId}';
        }, 600000); // 10 minutes
    </script>
</body>
</html>`;

    // Set headers for proper rendering
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Send the HTML
    res.send(iframeHTML);
  } catch (error) {
    logger.error("[KASHIER-IFRAME] Error serving iframe:", {
      error: error.message,
      sessionId: req.params.sessionId,
    });

    res.status(500).send("Error loading payment page");
  }
});

/**
 * Process successful payment and fulfill recharge
 */
async function processSuccessfulPayment(paymentData) {
  const { merchantOrderId, status, transactionId } = paymentData;

  try {
    logger.info("[KASHIER-PROCESS] Processing successful payment:", {
      merchantOrderId,
      status,
      transactionId,
    });

    // Find session by order ID
    let sessionData = null;
    for (const [sessionId, session] of paymentSessions.entries()) {
      if (session.orderId === merchantOrderId) {
        sessionData = session;
        sessionData.sessionId = sessionId;
        break;
      }
    }

    if (!sessionData) {
      throw new Error(`Session not found for order: ${merchantOrderId}`);
    }

    // Check if already processed
    if (
      sessionData.status === "completed" ||
      sessionData.status === "processing"
    ) {
      logger.info(
        "[KASHIER-PROCESS] Payment already processed or processing:",
        {
          merchantOrderId,
          status: sessionData.status,
        }
      );
      return;
    }

    // Check if already being processed by another request
    if (processingLocks.has(merchantOrderId)) {
      logger.info(
        "[KASHIER-PROCESS] Payment already being processed by another request:",
        {
          merchantOrderId,
        }
      );
      return;
    }

    // Add processing lock
    processingLocks.add(merchantOrderId);

    // Update session status
    sessionData.status = "processing";
    sessionData.processedAt = new Date().toISOString();
    sessionData.transactionId = transactionId;

    // Process Uquid recharge
    const { topUpAmount, phoneNumber } = sessionData;

    logger.info("[KASHIER-PROCESS] Processing Uquid recharge:", {
      topUpAmount,
      phoneNumber: maskPhoneNumber(phoneNumber),
    });

    // Calculate API call splits
    const apiCallSplits = calculateApiCallSplit(topUpAmount);

    // Get fresh product list
    const vodafoneProducts = await uquidService.getVodafoneProducts();

    // Validate and get products for all splits
    const { selectedProducts } = await validateAndGetSplitProducts(
      apiCallSplits,
      vodafoneProducts
    );

    // Format phone number for Uquid
    const formattedPhone = formatPhoneForUquid(phoneNumber);

    // Submit multiple orders based on splits
    const orderResults = await uquidService.processMultipleOrders(
      selectedProducts,
      apiCallSplits,
      formattedPhone
    );

    // Confirm all orders
    const confirmationResults = await uquidService.confirmMultipleOrders(
      orderResults
    );

    // Update session status to completed
    sessionData.status = "completed";
    sessionData.completedAt = new Date().toISOString();
    sessionData.uquidOrders = orderResults;
    sessionData.confirmationResults = confirmationResults;

    // Remove processing lock
    processingLocks.delete(merchantOrderId);

    logger.info("[KASHIER-PROCESS] ✅ Payment processed successfully:", {
      merchantOrderId,
      transactionId,
      topUpAmount,
      phoneNumber: maskPhoneNumber(phoneNumber),
      totalOrders: orderResults.length,
      totalConfirmed: confirmationResults.filter((c) => c.confirmed).length,
    });

    // Log successful transaction
    logTransaction(
      "kashier_topup_success",
      {
        merchantOrderId,
        transactionId,
        topUpAmount,
        phoneNumber: maskPhoneNumber(phoneNumber),
      },
      true
    );
  } catch (error) {
    logger.error("[KASHIER-PROCESS] Payment processing failed:", {
      error: error.message,
      merchantOrderId,
      transactionId,
      stack: error.stack,
    });

    // Log failed transaction
    logTransaction(
      "kashier_topup_failed",
      {
        merchantOrderId,
        transactionId,
        error: error.message,
      },
      false
    );

    // Remove processing lock on error
    processingLocks.delete(merchantOrderId);

    throw error;
  }
}

export default router;
