import crypto from "crypto";
import { KASHIER_CONFIG } from "../config/index.js";
import logger from "../middleware/logger.js";

class KashierService {
  constructor() {
    this.apiKey = KASHIER_CONFIG.API_KEY;
    this.secretKey = KASHIER_CONFIG.API_SECRET;
    this.merchantId = KASHIER_CONFIG.MERCHANT_ID;
    this.mode = KASHIER_CONFIG.MODE;
    this.baseUrl = KASHIER_CONFIG.BASE_URL;
  }

  /**
   * Generate Kashier order hash for payment validation
   * @param {Object} order - Order details
   * @param {string} order.amount - Order amount
   * @param {string} order.currency - Order currency (EGP)
   * @param {string} order.orderId - Unique order identifier
   * @param {string} order.customerReference - Customer reference for card saving (optional)
   * @returns {string} - Generated hash
   */
  generateOrderHash(order) {
    const { amount, currency, orderId, customerReference } = order;

    // Build the path string as per Kashier documentation
    const path = `/?payment=${
      this.merchantId
    }.${orderId}.${amount}.${currency}${
      customerReference ? "." + customerReference : ""
    }`;

    // Generate HMAC SHA256 hash
    const hash = crypto
      .createHmac("sha256", this.secretKey)
      .update(path)
      .digest("hex");

    logger.info("[KASHIER] Generated order hash:", {
      path,
      hash,
      orderId,
      amount,
      currency,
    });

    return hash;
  }

  /**
   * Validate signature from Kashier webhook/redirect
   * @param {Object} query - Query parameters from redirect/webhook
   * @returns {boolean} - True if signature is valid
   */
  validateSignature(query) {
    // Build query string excluding signature and mode (as per Kashier docs)
    let queryString = "";
    for (let key in query) {
      if (key === "signature" || key === "mode") continue;
      queryString += "&" + key + "=" + query[key];
    }

    // Remove leading '&'
    const finalUrl = queryString.substr(1);

    // Generate signature using Payment API Key (as per Kashier docs)
    const signature = crypto
      .createHmac("sha256", this.apiKey)
      .update(finalUrl)
      .digest("hex");

    const kashierSignature = query.signature;

    const isValid = kashierSignature === signature;

    logger.info("[KASHIER] Signature validation:", {
      isValid,
      generatedSignature: signature,
      receivedSignature: kashierSignature,
      queryString: finalUrl,
      originalQuery: query,
    });

    return isValid;
  }

  /**
   * Create payment session using Kashier API
   * @param {Object} paymentData - Payment details
   * @returns {Object} - Payment session response
   */
  async createPaymentSession(paymentData) {
    const {
      amount,
      currency = "EGP",
      orderId,
      merchantRedirect,
      serverWebhook,
      description,
      customer,
      metaData = {},
    } = paymentData;

    const sessionData = {
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: amount.toString(),
      currency,
      order: orderId,
      merchantRedirect: merchantRedirect,
      display: "ar", // Arabic display
      type: "one-time",
      allowedMethods: "card,wallet,bank_installments,fawry",
      redirectMethod: "get",
      iframeBackgroundColor: "#FFFFFF",
      metaData: {
        ...metaData,
        displayNotes: {
          order_type: "mobile_recharge",
          service: "vodafone_egypt",
        },
      },
      merchantId: this.merchantId,
      failureRedirect: true,
      brandColor: "#DC2626", // Red color matching the app theme
      defaultMethod: "card",
      description: description || `شحن رصيد فودافون - ${amount} جنيه`,
      manualCapture: false,
      customer: customer
        ? {
            email: customer.email,
            reference: customer.reference,
          }
        : undefined,
      saveCard: "optional",
      retrieveSavedCard: false, // Disable saved card retrieval to prevent API errors
      interactionSource: "ECOMMERCE",
      enable3DS: true,
      serverWebhook,
      notes: "Mobile recharge service",
    };

    try {
      logger.info("[KASHIER] Creating payment session with data:", {
        merchantRedirect: sessionData.merchantRedirect,
        serverWebhook: sessionData.serverWebhook,
        orderId: sessionData.order,
        amount: sessionData.amount,
        currency: sessionData.currency,
      });

      const response = await fetch(`${this.baseUrl}/v3/payment/sessions`, {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Kashier API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();

      logger.info("[KASHIER] Payment session created:", {
        sessionId: result._id,
        sessionUrl: result.sessionUrl,
        orderId,
      });

      return result;
    } catch (error) {
      logger.error("[KASHIER] Failed to create payment session:", {
        error: error.message,
        orderId,
        amount,
      });
      throw error;
    }
  }

  /**
   * Get payment session status
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session status
   */
  async getPaymentSessionStatus(sessionId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/v3/payment/sessions/${sessionId}/payment`,
        {
          method: "GET",
          headers: {
            Authorization: this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Kashier API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();

      logger.info("[KASHIER] Payment session status retrieved:", {
        sessionId,
        status: result.data?.status,
      });

      return result;
    } catch (error) {
      logger.error("[KASHIER] Failed to get payment session status:", {
        error: error.message,
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Validate webhook signature and extract event data
   * @param {Object} webhookData - Webhook request body
   * @param {string} signature - Webhook signature from headers
   * @returns {Object} - Validated webhook data
   */
  validateWebhook(webhookData, signature) {
    const { data, event } = webhookData;

    if (!data || !data.signatureKeys) {
      throw new Error("Invalid webhook data structure");
    }

    // Sort signature keys alphabetically
    data.signatureKeys.sort();

    // Create signature payload
    const signaturePayload = {};
    data.signatureKeys.forEach((key) => {
      if (data[key] !== undefined) {
        signaturePayload[key] = data[key];
      }
    });

    // Convert to query string format
    const queryString = Object.entries(signaturePayload)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    // Generate signature
    const generatedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(queryString)
      .digest("hex");

    // Compare signatures
    if (signature !== generatedSignature) {
      logger.error("[KASHIER] Webhook signature validation failed:", {
        receivedSignature: signature,
        generatedSignature,
        queryString,
      });
      throw new Error("Invalid webhook signature");
    }

    logger.info("[KASHIER] Webhook signature validated successfully:", {
      event,
      orderId: data.merchantOrderId,
      status: data.status,
    });

    return { data, event };
  }

  /**
   * Generate iframe parameters for frontend
   * @param {Object} paymentData - Payment details
   * @returns {Object} - Iframe parameters
   */
  generateIframeParams(paymentData) {
    const {
      amount,
      currency = "EGP",
      orderId,
      merchantRedirect,
      serverWebhook,
      description,
      customer,
      metaData = {},
    } = paymentData;

    const hash = this.generateOrderHash({
      amount,
      currency,
      orderId,
      customerReference: customer?.reference,
    });

    return {
      "data-amount": amount.toString(),
      "data-hash": hash,
      "data-currency": currency,
      "data-orderId": orderId,
      "data-merchantId": this.merchantId,
      "data-merchantRedirect": encodeURIComponent(merchantRedirect),
      "data-serverWebhook": serverWebhook,
      "data-mode": this.mode,
      "data-metaData": encodeURIComponent(
        JSON.stringify({
          ...metaData,
          displayNotes: {
            order_type: "mobile_recharge",
            service: "vodafone_egypt",
          },
        })
      ),
      "data-description": description || `شحن رصيد فودافون - ${amount} جنيه`,
      "data-allowedMethods": "card,wallet,bank_installments,fawry",
      "data-defaultMethod": "card",
      "data-redirectMethod": "get",
      "data-failureRedirect": "true",
      "data-type": "external",
      "data-brandColor": "#DC2626",
      "data-display": "ar",
      "data-manualCapture": "false",
      "data-customer": customer
        ? encodeURIComponent(JSON.stringify(customer))
        : undefined,
      "data-saveCard": "optional",
      "data-interactionSource": "ECOMMERCE",
      "data-enable3DS": "true",
    };
  }
}

export default new KashierService();
