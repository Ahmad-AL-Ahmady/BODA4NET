import express from "express";
import {
  validatePhoneNumber,
  validateAmount,
  validatePaymentData,
  handleValidationErrors,
} from "../middleware/security.js";
import logger, { logTransaction } from "../middleware/logger.js";

import uquidService from "../services/uquidService.js";
import {
  calculateApiCallSplit,
  validateAndGetSplitProducts,
  calculateServiceFee,
  extractTopUpAmount,
  formatPhoneForUquid,
  generateFlowId,
  maskPhoneNumber,
  extractPhoneFromDetails,
  isValidVodafoneNumber,
  isValidAmount,
  delay,
} from "../utils/index.js";

const router = express.Router();

// Temporary in-memory storage for test mode payment data
// In production, this would be stored in a database
const testPaymentStore = new Map();

// Payment endpoint - TEST MODE (no payment gateway required)
router.post(
  "/create",
  validatePhoneNumber,
  validateAmount,
  handleValidationErrors,
  async (req, res) => {
    const flowId = generateFlowId();
    const flowStartTime = Date.now();

    try {
      const { phoneNumber, vodafoneCashNumber, amount } = req.body;

      logger.info(`[PAYMENT-${flowId}] 🚀 TEST MODE - Payment flow started:`, {
        flowId,
        phoneNumber: maskPhoneNumber(phoneNumber),
        vodafoneCashNumber: maskPhoneNumber(vodafoneCashNumber),
        amount,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date().toISOString(),
      });

      // Validate required fields
      if (!phoneNumber || !vodafoneCashNumber || !amount) {
        logger.error(`[PAYMENT-${flowId}] ❌ Missing required fields:`, {
          phoneNumber: !!phoneNumber,
          vodafoneCashNumber: !!vodafoneCashNumber,
          amount: !!amount,
        });

        return res.status(400).json({
          success: false,
          message:
            "Phone number, Vodafone Cash number, and amount are required",
          flowId,
          debug: {
            receivedFields: {
              phoneNumber: !!phoneNumber,
              vodafoneCashNumber: !!vodafoneCashNumber,
              amount: !!amount,
            },
          },
        });
      }

      // Validate phone number format
      if (!isValidVodafoneNumber(phoneNumber)) {
        logger.error(`[PAYMENT-${flowId}] ❌ Invalid phone number format:`, {
          phoneNumber: maskPhoneNumber(phoneNumber),
          format: "Should be 010XXXXXXXX",
        });

        return res.status(400).json({
          success: false,
          message: "Invalid phone number format (must be Vodafone Egypt)",
          flowId,
          debug: {
            phoneNumberLength: phoneNumber.length,
            startsWithCorrectPrefix: phoneNumber.startsWith("010"),
          },
        });
      }

      // Validate Vodafone Cash number format
      if (!isValidVodafoneNumber(vodafoneCashNumber)) {
        logger.error(
          `[PAYMENT-${flowId}] ❌ Invalid Vodafone Cash number format:`,
          {
            vodafoneCashNumber: maskPhoneNumber(vodafoneCashNumber),
            format: "Should be 010XXXXXXXX",
          }
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid Vodafone Cash number format (must be Vodafone Egypt)",
          flowId,
          debug: {
            vodafoneCashNumberLength: vodafoneCashNumber.length,
            startsWithCorrectPrefix: vodafoneCashNumber.startsWith("010"),
          },
        });
      }

      // Validate amount
      if (!isValidAmount(amount)) {
        return res.status(400).json({
          success: false,
          message: "Top-up amount must be between 5 and 2000 EGP",
        });
      }

      // Calculate total amount with service fee
      const { topUpAmount, serviceFee, totalAmount } =
        calculateServiceFee(amount);

      logger.info(`[PAYMENT-${flowId}] 💰 Amount calculations:`, {
        originalAmount: amount,
        topUpAmount,
        serviceFee,
        totalAmount,
      });

      // Calculate API call splits for large amounts
      const apiCallSplits = calculateApiCallSplit(topUpAmount);

      logger.info(`[PAYMENT-${flowId}] 🔄 API call splits calculated:`, {
        splitsCount: apiCallSplits.length,
        splits: apiCallSplits,
      });

      // Check for products using the split amounts (Uquid product validation)
      const step1StartTime = Date.now();
      logger.info(`[PAYMENT-${flowId}] 📦 Step 1: Fetching Uquid products...`);

      const vodafoneProducts = await uquidService.getVodafoneProducts();

      logger.info(`[PAYMENT-${flowId}] 📦 Product fetch result:`, {
        itemsCount: vodafoneProducts.length,
        duration: Date.now() - step1StartTime,
      });

      // Validate and get products for all splits
      const { selectedProducts, totalRequiredBalance } =
        await validateAndGetSplitProducts(apiCallSplits, vodafoneProducts);

      // Check if the balance in Uquid can afford the transaction
      const availableBalance = await uquidService.getUSDTBalance();

      if (availableBalance < totalRequiredBalance) {
        throw new Error(
          `Insufficient balance. Available: ${availableBalance} USDT, Required: ${totalRequiredBalance} USD for ${topUpAmount} EGP top-up (${apiCallSplits.length} API calls)`
        );
      }

      // Generate fake payment reference for testing
      const testPaymentId = `TEST_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      const testReference = `REF_${Date.now()}`;

      // Store payment data for test mode processing
      testPaymentStore.set(testPaymentId, {
        phoneNumber,
        vodafoneCashNumber,
        amount: topUpAmount,
        totalAmount,
        serviceFee,
        reference: testReference,
        created: new Date().toISOString(),
      });

      logger.info(
        `[PAYMENT-${flowId}] 💳 TEST MODE - Simulated payment created:`,
        {
          paymentId: testPaymentId,
          reference: testReference,
          amount: totalAmount,
        }
      );

      res.json({
        success: true,
        message: `TEST MODE: Payment simulation created - You would pay ${totalAmount} EGP (${topUpAmount} EGP top-up + ${serviceFee} EGP 20% service fee)`,
        reference: testReference,
        paymentId: testPaymentId,
        topUpAmount: topUpAmount,
        serviceFee: serviceFee,
        totalAmount: totalAmount,
        uquidProducts: selectedProducts,
        apiCallSplits: apiCallSplits,
        totalRequiredBalance: totalRequiredBalance,
        uquidBalance: availableBalance,
        testMode: true,
      });
    } catch (error) {
      const totalFlowDuration = Date.now() - flowStartTime;

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

// Payment processing endpoint - TEST MODE (simulates successful payment)
router.post(
  "/check-and-process",
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
      logger.info(
        `[TRANSACTION] 🔄 TEST MODE - Starting payment check and process:`,
        {
          paymentId,
          reference,
          timestamp: new Date().toISOString(),
        }
      );

      // In test mode, we simulate successful payment after a short delay
      await delay(2000); // 2 second delay to simulate payment processing

      // Retrieve stored payment data
      const storedPaymentData = testPaymentStore.get(paymentId);
      if (!storedPaymentData) {
        return res.status(404).json({
          success: false,
          message: "Payment not found - may have expired or invalid payment ID",
          testMode: true,
        });
      }

      const {
        phoneNumber: testPhoneNumber,
        vodafoneCashNumber: testVodafoneCashNumber,
        totalAmount: testTotalAmount,
      } = storedPaymentData;

      logger.info(`[TRANSACTION] 📱 TEST MODE - Using test phone numbers:`, {
        vodafoneCashNumber: maskPhoneNumber(testVodafoneCashNumber),
        phoneNumber: maskPhoneNumber(testPhoneNumber),
        totalPaidAmount: testTotalAmount,
      });

      // Calculate the original top-up amount (excluding service fee)
      const { topUpAmount, serviceFee } = extractTopUpAmount(testTotalAmount);

      logger.info(`[TRANSACTION] 💰 Calculated amounts:`, {
        totalPaidAmount: testTotalAmount,
        topUpAmount,
        serviceFee,
      });

      // Process Uquid orders
      logger.info(`[TRANSACTION] 🔄 Step 3: Processing Uquid orders...`);
      const apiCallSplits = calculateApiCallSplit(topUpAmount);

      logger.info(`[TRANSACTION] 🔄 API call splits for confirmed payment:`, {
        splitsCount: apiCallSplits.length,
        splits: apiCallSplits,
      });

      // Get fresh product list
      const vodafoneProducts = await uquidService.getVodafoneProducts();

      // Validate and get products for all splits
      const { selectedProducts } = await validateAndGetSplitProducts(
        apiCallSplits,
        vodafoneProducts
      );

      // Format phone number for Uquid
      const formattedPhone = formatPhoneForUquid(testPhoneNumber);

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

      const finalTransaction = {
        topUpAmount: Math.round(topUpAmount * 100) / 100,
        serviceFee: Math.round(serviceFee * 100) / 100,
        totalPaid: parseFloat(testTotalAmount),
        phoneNumber: testPhoneNumber,
        vodafoneCashNumber: testVodafoneCashNumber,
        totalOrders: orderResults.length,
        totalConfirmed: confirmationResults.filter((c) => c.confirmed).length,
      };

      logger.info(
        `[TRANSACTION] 🎉 TEST MODE - Transaction completed successfully:`,
        {
          ...finalTransaction,
          phoneNumber: maskPhoneNumber(finalTransaction.phoneNumber),
          vodafoneCashNumber: maskPhoneNumber(
            finalTransaction.vodafoneCashNumber
          ),
        }
      );

      res.json({
        success: true,
        message: "TEST MODE: Top-up successful!",
        testPaymentTransaction: {
          id: paymentId,
          reference: reference,
          status: "completed",
          amount: testTotalAmount,
          number: testVodafoneCashNumber,
          details: `TEST MODE: Vodafone Egypt Top-up ${topUpAmount} EGP (+ ${serviceFee} EGP 20% service fee) - Recharge phone: ${testPhoneNumber}`,
        },
        uquidOrders: orderResults,
        confirmationResults: confirmationResults,
        uquidOrder: orderResults[0]
          ? {
              batch_id: orderResults[0].batchId,
              status: "processing",
            }
          : null,
        transaction: finalTransaction,
        testMode: true,
      });
    } catch (error) {
      logger.error("[TRANSACTION] TEST MODE Failed:", {
        error: error.message,
        paymentId,
        reference,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      logTransaction(
        "uquid_topup_test",
        { paymentId, reference, error: error.message },
        false
      );

      res.status(500).json({
        success: false,
        message: error.message,
        debug: {
          paymentId,
          reference,
          timestamp: new Date().toISOString(),
          testMode: true,
        },
      });
    }
  }
);

// Payment info endpoint - TEST MODE
router.get("/info/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    // In test mode, return simulated payment info
    const testPaymentInfo = {
      id: transactionId,
      reference: `REF_${transactionId}`,
      status: "completed",
      amount: 24,
      number: "01087654321",
      details: "TEST MODE: Simulated payment information",
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      payment: testPaymentInfo,
      message: "TEST MODE: Payment info retrieved",
      testMode: true,
    });
  } catch (error) {
    logger.error("[PAYMENT-INFO] TEST MODE Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment info",
      testMode: true,
    });
  }
});

export default router;
