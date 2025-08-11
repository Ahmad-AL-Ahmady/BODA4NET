import { SHA7NAWY_CONFIG, HEALTH_CONFIG } from "../config/index.js";
import logger from "../middleware/logger.js";
import { generateFlowId } from "../utils/index.js";

/**
 * Sha7nawy Service - Handles all Sha7nawy Payment API operations
 */
class Sha7nawyService {
  constructor() {
    this.publicKey = SHA7NAWY_CONFIG.PUBLIC_KEY;
    this.secretKey = SHA7NAWY_CONFIG.SECRET_KEY;
    this.baseUrl = SHA7NAWY_CONFIG.BASE_URL;
    this.timeout = SHA7NAWY_CONFIG.TIMEOUT;
  }

  /**
   * Makes a request to the Sha7nawy API
   * @param {string} endpoint - The API endpoint (e.g., "/payment/create")
   * @param {object|null} requestBody - The body for POST requests
   * @param {boolean} useSecretKey - Whether to use the secret key for authorization
   * @returns {Promise<object>} The response data from the API
   */
  async makeRequest(endpoint, requestBody = null, useSecretKey = false) {
    const startTime = Date.now();
    const requestId = generateFlowId();

    try {
      // Check if API keys are configured
      if (!this.publicKey || !this.secretKey) {
        throw new Error(
          "Sha7nawy API credentials not configured. Please set SHA7NAWY_PUBLIC_KEY and SHA7NAWY_SECRET_KEY in your .env file"
        );
      }

      const url = `${this.baseUrl}${endpoint}`;
      const authKey = useSecretKey ? this.secretKey : this.publicKey;
      const headers = {
        Accept: "application/json",
        Authorization: authKey,
      };

      const options = {
        method: requestBody ? "POST" : "GET",
        headers,
        timeout: this.timeout,
      };

      if (requestBody) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(requestBody);
      }

      logger.info(`[SHA7NAWY-${requestId}] Making API request:`, {
        endpoint,
        method: options.method,
        url,
        hasAuthKey: !!authKey,
        hasRequestBody: !!requestBody,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(url, options);
      const duration = Date.now() - startTime;

      logger.info(`[SHA7NAWY-${requestId}] API response received:`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        duration,
        ok: response.ok,
      });

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

  /**
   * Create a payment request
   * @param {object} paymentData - Payment creation data
   * @returns {Promise<object>} Payment creation response
   */
  async createPayment(paymentData) {
    const { number, amount, method, client, details } = paymentData;

    const requestBody = {
      number,
      amount,
      method,
      client,
      details,
    };

    logger.info(`[SHA7NAWY] Creating payment request:`, {
      number: number.substring(0, 3) + "***" + number.substring(8),
      amount,
      method,
      client,
      details,
    });

    const response = await this.makeRequest("/payment/create", requestBody);

    if (!response.status || !response.data) {
      throw new Error(response.message || "Failed to create payment");
    }

    return response;
  }

  /**
   * Confirm a payment
   * @param {string} refCode - The reference code for the payment
   * @returns {Promise<object>} Payment confirmation response
   */
  async confirmPayment(refCode) {
    const requestBody = { ref_code: refCode };

    logger.info(`[SHA7NAWY] Confirming payment:`, {
      refCode,
    });

    try {
      const response = await this.makeRequest(
        "/payment/confirm",
        requestBody,
        false // Use public key for confirm
      );
      logger.info(`[SHA7NAWY] Payment confirmation successful`);
      return response;
    } catch (confirmError) {
      logger.warn(`[SHA7NAWY] Payment confirmation failed:`, {
        error: confirmError.message,
      });
      throw confirmError;
    }
  }

  /**
   * Get payment information
   * @param {string} paymentId - The payment ID
   * @returns {Promise<object>} Payment information response
   */
  async getPaymentInfo(paymentId) {
    logger.info(`[SHA7NAWY] Getting payment info:`, {
      paymentId,
    });

    const response = await this.makeRequest(
      `/payment/${paymentId}`,
      null,
      true // Use secret key for payment info
    );

    if (!response.status || !response.data) {
      throw new Error(
        response.message || "Failed to get payment info from Sha7nawy"
      );
    }

    return response;
  }

  /**
   * Check payment status and process accordingly
   * @param {string} paymentId - The payment ID
   * @param {string} reference - The payment reference
   * @returns {Promise<object>} Payment status and data
   */
  async checkPaymentStatus(paymentId, reference) {
    // Step 1: Always run the confirm API first (non-blocking)
    try {
      logger.info(`[SHA7NAWY] Step 1: Confirming payment...`);
      await this.confirmPayment(reference);
    } catch (confirmError) {
      // Continue with payment info check even if confirm fails
      logger.warn(`[SHA7NAWY] Payment confirmation failed, continuing:`, {
        error: confirmError.message,
      });
    }

    // Small delay to ensure proper API sequencing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Always check actual payment status
    logger.info(`[SHA7NAWY] Step 2: Checking payment status...`);
    const paymentInfo = await this.getPaymentInfo(paymentId);

    const paymentStatus = paymentInfo.data.status?.toLowerCase();

    logger.info(`[SHA7NAWY] Payment status response:`, {
      success: paymentInfo.status,
      status: paymentStatus,
      hasData: !!paymentInfo.data,
    });

    // Determine payment status category
    if (
      paymentStatus === "completed" ||
      paymentStatus === "success" ||
      paymentStatus === "paid"
    ) {
      return {
        status: "completed",
        data: paymentInfo.data,
        message: "Payment completed successfully",
      };
    } else if (
      paymentStatus === "rejected" ||
      paymentStatus === "failed" ||
      paymentStatus === "cancelled"
    ) {
      return {
        status: "failed",
        data: paymentInfo.data,
        message: `Payment was ${paymentStatus}. Transaction stopped.`,
      };
    } else if (paymentStatus === "pending" || paymentStatus === "processing") {
      return {
        status: "pending",
        data: paymentInfo.data,
        message: `Payment is still ${paymentStatus}. Please wait and try again.`,
        shouldRetry: true,
      };
    } else {
      return {
        status: "unknown",
        data: paymentInfo.data,
        message: `Unknown payment status: ${paymentStatus}`,
      };
    }
  }

  /**
   * Check if Sha7nawy service is healthy
   * @returns {Promise<boolean>} Service health status
   */
  async isHealthy() {
    try {
      // Test Sha7nawy API (basic connectivity)
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        timeout: HEALTH_CONFIG.HEALTH_TIMEOUT,
      });
      return response.ok;
    } catch (error) {
      logger.warn("Sha7nawy health check failed:", error.message);
      return false;
    }
  }

  /**
   * Validate payment creation data
   * @param {object} paymentData - Payment data to validate
   * @returns {object} Validation result
   */
  validatePaymentData(paymentData) {
    const { number, amount, method, client, details } = paymentData;
    const errors = [];

    if (!number) {
      errors.push("Phone number is required");
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      errors.push("Valid amount is required");
    }

    if (!method) {
      errors.push("Payment method is required");
    }

    if (!client) {
      errors.push("Client information is required");
    }

    if (!details) {
      errors.push("Payment details are required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export default new Sha7nawyService();
