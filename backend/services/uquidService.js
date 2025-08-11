import crypto from "crypto";
import axios from "axios";
import { UQUID_CONFIG } from "../config/index.js";
import logger from "../middleware/logger.js";
import { roundToTwo, delay, generateFlowId } from "../utils/index.js";

/**
 * Uquid Service - Handles all Uquid API operations
 */
class UquidService {
  constructor() {
    this.apiKey = UQUID_CONFIG.API_KEY;
    this.apiSecret = UQUID_CONFIG.API_SECRET;
    this.baseUrl = UQUID_CONFIG.BASE_URL;
    this.timeout = UQUID_CONFIG.TIMEOUT;
  }

  /**
   * Generates an HMAC-SHA256 signature for Uquid API requests
   * @param {object} requestBody - The request body object
   * @returns {string} The generated hexadecimal signature
   */
  generateSignature(requestBody) {
    if (!this.apiSecret) {
      throw new Error("Uquid API secret not configured");
    }

    // Convert to JSON string (exactly as the API expects)
    const params = JSON.stringify(requestBody);

    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(params)
      .digest("hex");

    return signature;
  }

  /**
   * Makes a request to the Uquid API
   * @param {object} requestBody - The body of the request
   * @returns {Promise<object>} The response data from the API
   */
  async makeRequest(requestBody) {
    const startTime = Date.now();
    const requestId = generateFlowId();

    try {
      // Check if API keys are configured
      if (!this.apiKey || !this.apiSecret) {
        throw new Error(
          "Uquid API credentials not configured. Please set UQ_PUBLIC_KEY and UQ_SECRET_KEY in your .env file"
        );
      }

      const signature = this.generateSignature(requestBody);
      const url = `${this.baseUrl}?api_key=${this.apiKey}&signature=${signature}`;

      logger.info(`[UQUID-${requestId}] Making API request:`, {
        action: requestBody.action,
        url: url.substring(0, 50) + "...",
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });

      const response = await axios.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;

      logger.info(`[UQUID-${requestId}] API response received:`, {
        action: requestBody.action,
        status: response.status,
        statusText: response.statusText,
        duration,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });

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
   * Get account balance from Uquid
   * @returns {Promise<object>} Balance information
   */
  async getAccountBalance() {
    const requestBody = {
      action: "queryAccountBalance",
      nonce: Math.round(Date.now() / 1000),
    };

    const response = await this.makeRequest(requestBody);

    if (!response.status || !response.data) {
      throw new Error("Could not fetch account balance from Uquid.");
    }

    return response.data;
  }

  /**
   * Get USDT balance specifically
   * @returns {Promise<number>} Available USDT balance
   */
  async getUSDTBalance() {
    const balanceData = await this.getAccountBalance();
    const usdtBalance = balanceData.find((b) => b.symbol === "usdt");
    return usdtBalance ? parseFloat(usdtBalance.available) : 0;
  }

  /**
   * Get product list from Uquid
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<object>} Product list response
   */
  async getProductList(page = 1) {
    const requestBody = {
      action: "queryProductList",
      nonce: Math.round(Date.now() / 1000),
      params: { page },
    };

    const response = await this.makeRequest(requestBody);

    if (!response.status || !response.data?.items) {
      throw new Error("Could not fetch product list from Uquid.");
    }

    return response.data;
  }

  /**
   * Get all Vodafone Egypt products
   * @returns {Promise<Array>} Array of Vodafone products
   */
  async getVodafoneProducts() {
    let allVodafoneProducts = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages && page <= 10) {
      // Limit to 10 pages max
      try {
        const response = await this.getProductList(page);

        if (response.items && response.items.length > 0) {
          const vodafoneProducts = response.items.filter((product) => {
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
          hasMorePages = response.items.length > 0;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (error) {
        logger.error(`Error fetching page ${page}:`, error.message);
        hasMorePages = false;
      }
    }

    if (allVodafoneProducts.length === 0) {
      throw new Error("No Vodafone Egypt products found on Uquid.");
    }

    return allVodafoneProducts;
  }

  /**
   * Submit an order to Uquid
   * @param {object} orderParams - Order parameters
   * @returns {Promise<object>} Order response
   */
  async submitOrder(orderParams) {
    const {
      productId,
      amount,
      phoneNumber,
      mode = "live",
      coin = "usdt",
      quantity = "1",
    } = orderParams;

    const requestBody = {
      action: "submitOrder",
      nonce: Math.round(Date.now() / 1000),
      params: {
        _order_product_id: productId,
        _order_coin: coin,
        _order_mode: mode,
        _order_quantity: quantity,
        _order_value: roundToTwo(amount).toString(),
        _order_force_mode: mode,
        mobile_number: phoneNumber,
      },
    };

    const response = await this.makeRequest(requestBody);

    if (!response.status || !response.data.batch_id) {
      throw new Error(
        `Failed to submit Uquid order: ${response.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  /**
   * Confirm an order
   * @param {string} batchId - The batch ID from submitOrder
   * @returns {Promise<object>} Confirmation response
   */
  async confirmOrder(batchId) {
    const requestBody = {
      action: "confirmOrder",
      nonce: Math.round(Date.now() / 1000),
      params: { batch_id: batchId },
    };

    const response = await this.makeRequest(requestBody);
    return response;
  }

  /**
   * Check order status
   * @param {string} batchId - The batch ID to check
   * @returns {Promise<object>} Order status response
   */
  async checkOrderStatus(batchId) {
    const requestBody = {
      action: "checkOrder",
      nonce: Math.round(Date.now() / 1000),
      params: { batch_id: batchId },
    };

    const response = await this.makeRequest(requestBody);

    if (!response.status || !response.data) {
      throw new Error("Failed to check order status");
    }

    return response.data;
  }

  /**
   * Process multiple orders with splits
   * @param {Array} selectedProducts - Array of products with split information
   * @param {Array} apiCallSplits - Array of split amounts
   * @param {string} phoneNumber - Formatted phone number
   * @returns {Promise<Array>} Array of order results
   */
  async processMultipleOrders(selectedProducts, apiCallSplits, phoneNumber) {
    logger.info(
      `[UQUID] Submitting ${selectedProducts.length} orders to Uquid...`
    );
    const orderResults = [];

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      const split = apiCallSplits[i];

      logger.info(
        `[UQUID] Submitting order ${i + 1}/${selectedProducts.length}:`,
        {
          productId: product.id,
          productName: product.name,
          amount: split.amount,
          count: split.count,
          phoneNumber:
            phoneNumber.substring(0, 3) + "***" + phoneNumber.substring(8),
        }
      );

      for (let j = 0; j < split.count; j++) {
        const orderResult = await this.submitOrder({
          productId: product.id,
          amount: split.amount,
          phoneNumber,
          mode: "live",
        });

        orderResults.push({
          batchId: orderResult.batch_id,
          amount: split.amount,
          productName: product.name,
          submitResponse: orderResult,
        });

        // Add delay between orders
        if (
          orderResults.length <
          selectedProducts.reduce((total, p) => total + p.requestedCount, 0)
        ) {
          await delay(500);
        }
      }
    }

    return orderResults;
  }

  /**
   * Confirm multiple orders
   * @param {Array} orderResults - Array of order results from processMultipleOrders
   * @returns {Promise<Array>} Array of confirmation results
   */
  async confirmMultipleOrders(orderResults) {
    logger.info(`[UQUID] Confirming ${orderResults.length} orders...`);
    const confirmationResults = [];

    for (let i = 0; i < orderResults.length; i++) {
      const order = orderResults[i];

      logger.info(`[UQUID] Confirming order ${i + 1}/${orderResults.length}:`, {
        batchId: order.batchId,
        amount: order.amount,
        productName: order.productName,
      });

      try {
        const confirmResponse = await this.confirmOrder(order.batchId);
        confirmationResults.push({
          batchId: order.batchId,
          amount: order.amount,
          confirmed: confirmResponse.status,
          response: confirmResponse.data,
        });
      } catch (error) {
        confirmationResults.push({
          batchId: order.batchId,
          amount: order.amount,
          confirmed: false,
          error: error.message,
        });
      }

      // Add delay between confirmations
      if (i < orderResults.length - 1) {
        await delay(500);
      }
    }

    return confirmationResults;
  }

  /**
   * Check if Uquid service is healthy
   * @returns {Promise<boolean>} Service health status
   */
  async isHealthy() {
    try {
      const response = await this.getAccountBalance();
      return !!response;
    } catch (error) {
      logger.warn("Uquid health check failed:", error.message);
      return false;
    }
  }
}

// Export singleton instance
export default new UquidService();
