import express from "express";
import axios from "axios";
import logger from "../middleware/logger.js";
import uquidService from "../services/uquidService.js";
import { SERVER_CONFIG } from "../config/index.js";
import {
  isValidVodafoneNumber,
  isValidAmount,
  roundToTwo,
} from "../utils/index.js";

const router = express.Router();

// Get Vodafone products
router.get("/products", async (req, res) => {
  try {
    const vodafoneProducts = await uquidService.getVodafoneProducts();

    res.json({
      success: true,
      products: vodafoneProducts,
      total: vodafoneProducts.length,
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
router.post("/submit-order", async (req, res) => {
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
    const cleanPhone = phoneNumber.replace(/\s+/g, "");
    if (!isValidVodafoneNumber(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vodafone Egypt number format",
      });
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be between 8 and 2000 EGP",
      });
    }

    // Get Vodafone products
    const baseUrl =
      SERVER_CONFIG.NODE_ENV === "production"
        ? `${req.protocol}://${req.get("host")}`
        : `http://localhost:${SERVER_CONFIG.PORT}`;

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
    const orderResult = await uquidService.submitOrder({
      productId: selectedProduct.id,
      amount: parseFloat(amount),
      phoneNumber: cleanPhone,
      mode,
      coin: "usdt",
      quantity: "1",
    });

    res.json({
      success: true,
      order: orderResult,
      product: selectedProduct,
      denomination: selectedDenomination,
    });
  } catch (error) {
    logger.error("[UQUID] Error submitting order:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit order",
    });
  }
});

// Confirm order
router.post("/confirm-order", async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "Batch ID is required",
      });
    }

    const response = await uquidService.confirmOrder(batchId);

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
router.get("/order-status/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const response = await uquidService.checkOrderStatus(batchId);

    res.json({
      success: true,
      order: response,
    });
  } catch (error) {
    logger.error("[UQUID] Error checking order status:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check order status",
    });
  }
});

// Get account balance
router.get("/balance", async (req, res) => {
  try {
    const balance = await uquidService.getAccountBalance();

    res.json({
      success: true,
      balance: balance,
    });
  } catch (error) {
    logger.error("[UQUID] Error getting account balance:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get account balance",
    });
  }
});

// Check Uquid product availability for a specific amount
router.get("/products/check/:amount", async (req, res) => {
  try {
    const { amount } = req.params;
    const topUpAmount = parseFloat(amount);

    if (!isValidAmount(topUpAmount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Must be between 5 and 2000 EGP",
      });
    }

    const vodafoneProducts = await uquidService.getVodafoneProducts();

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

export default router;
