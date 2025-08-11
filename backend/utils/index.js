import { BUSINESS_CONFIG } from "../config/index.js";

/**
 * Rounds a number to 2 decimal places to avoid floating-point precision issues
 * @param {number} num - The number to round
 * @returns {number} The rounded number
 */
export function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate how to split a large payment amount into multiple API calls
 * Each API call is limited to 200 EGP maximum
 * @param {number} amount - The total amount to split
 * @returns {Array} Array of {amount, count} objects
 */
export function calculateApiCallSplit(amount) {
  const MAX_API_AMOUNT = BUSINESS_CONFIG.MAX_API_AMOUNT || 200;

  // Round the input amount to prevent precision issues
  const roundedAmount = roundToTwo(amount);

  if (roundedAmount <= MAX_API_AMOUNT) {
    return [{ amount: roundedAmount, count: 1 }];
  }

  const splits = [];
  let remainingAmount = roundedAmount;

  // Use as many 200 EGP calls as possible
  const count200 = Math.floor(remainingAmount / 200);
  if (count200 > 0) {
    splits.push({ amount: 200, count: count200 });
    remainingAmount = roundToTwo(remainingAmount - count200 * 200);
  }

  // Split the remaining amount using available denominations
  const denominations = BUSINESS_CONFIG.AVAILABLE_DENOMINATIONS;

  for (const denom of denominations) {
    if (remainingAmount >= denom) {
      const count = Math.floor(remainingAmount / denom);
      splits.push({ amount: denom, count });
      remainingAmount = roundToTwo(remainingAmount - count * denom);
    }
  }

  // Handle any remaining fractional amount
  if (remainingAmount > 0.01) {
    // Use 0.01 to handle floating-point precision
    splits.push({ amount: roundToTwo(remainingAmount), count: 1 });
  }

  return splits;
}

/**
 * Validate that products exist for all split amounts and calculate total cost
 * @param {Array} apiCallSplits - Array of {amount, count} objects
 * @param {Array} vodafoneProducts - Available Vodafone products
 * @returns {Promise<object>} {selectedProducts, totalRequiredBalance}
 */
export async function validateAndGetSplitProducts(
  apiCallSplits,
  vodafoneProducts
) {
  const selectedProducts = [];
  let totalRequiredBalance = 0;

  for (const split of apiCallSplits) {
    // Round both values for comparison to handle floating-point precision
    const roundedSplitAmount = roundToTwo(split.amount);

    const product = vodafoneProducts.find(
      (p) => roundToTwo(p.extra?.range?.currentFace || 0) === roundedSplitAmount
    );

    if (!product) {
      // More helpful error message with debugging info
      const availableAmounts = vodafoneProducts
        .map((p) => p.extra?.range?.currentFace)
        .filter(Boolean)
        .sort((a, b) => a - b);

      throw new Error(
        `No suitable Uquid product found for amount ${roundedSplitAmount} EGP. Available amounts: ${availableAmounts.join(
          ", "
        )}`
      );
    }

    const productInfo = {
      ...product,
      requestedCount: split.count,
      totalPrice: roundToTwo(product.price * split.count),
    };

    selectedProducts.push(productInfo);
    totalRequiredBalance = roundToTwo(
      totalRequiredBalance + productInfo.totalPrice
    );
  }

  return { selectedProducts, totalRequiredBalance };
}

/**
 * Format phone number for Uquid API (remove leading 0 and add Egypt country code)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} Formatted phone number for international use
 */
export function formatPhoneForUquid(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, ""); // Remove all non-digit characters

  if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
    // Egyptian mobile number starting with 01 (11 digits)
    return `20${cleanPhone.substring(1)}`; // Convert 01xxxxxxxx to 201xxxxxxxx
  } else if (cleanPhone.startsWith("201") && cleanPhone.length === 13) {
    // Already in international format
    return cleanPhone;
  } else if (cleanPhone.startsWith("1") && cleanPhone.length === 10) {
    // Missing leading 0, add country code
    return `201${cleanPhone}`;
  } else {
    // Use as-is and let the API handle it
    return cleanPhone;
  }
}

/**
 * Calculate service fee and total amount
 * @param {number} topUpAmount - The base top-up amount
 * @returns {object} {topUpAmount, serviceFee, totalAmount}
 */
export function calculateServiceFee(topUpAmount) {
  const roundedTopUp = roundToTwo(parseFloat(topUpAmount));
  const serviceFee = roundToTwo(
    roundedTopUp * BUSINESS_CONFIG.SERVICE_FEE_RATE
  );
  const totalAmount = roundToTwo(roundedTopUp + serviceFee);

  return {
    topUpAmount: roundedTopUp,
    serviceFee,
    totalAmount,
  };
}

/**
 * Extract the original top-up amount from total paid amount (removing service fee)
 * @param {number} totalPaidAmount - The total amount paid including service fee
 * @returns {object} {topUpAmount, serviceFee}
 */
export function extractTopUpAmount(totalPaidAmount) {
  const topUpAmount = roundToTwo(
    parseFloat(totalPaidAmount) / (1 + BUSINESS_CONFIG.SERVICE_FEE_RATE)
  );
  const serviceFee = roundToTwo(parseFloat(totalPaidAmount) - topUpAmount);

  return { topUpAmount, serviceFee };
}

/**
 * Generate a unique flow/request ID
 * @returns {string} Unique identifier
 */
export function generateFlowId() {
  return Math.random().toString(36).substring(7);
}

/**
 * Mask sensitive information in phone numbers for logging
 * @param {string} phoneNumber - The phone number to mask
 * @returns {string} Masked phone number
 */
export function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 8) {
    return "invalid";
  }
  return phoneNumber.substring(0, 3) + "***" + phoneNumber.substring(8);
}

/**
 * Validate Vodafone Egypt phone number format
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} True if valid format
 */
export function isValidVodafoneNumber(phoneNumber) {
  return BUSINESS_CONFIG.PHONE_REGEX.test(phoneNumber);
}

/**
 * Validate top-up amount
 * @param {number} amount - The amount to validate
 * @returns {boolean} True if valid amount
 */
export function isValidAmount(amount) {
  const numAmount = parseFloat(amount);
  return (
    !isNaN(numAmount) &&
    numAmount >= BUSINESS_CONFIG.MIN_AMOUNT &&
    numAmount <= BUSINESS_CONFIG.MAX_AMOUNT
  );
}

/**
 * Create delay promise for API sequencing
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract phone number from payment details text
 * @param {string} detailsText - The payment details text
 * @param {string} fallback - Fallback phone number
 * @returns {string} Extracted or fallback phone number
 */
export function extractPhoneFromDetails(detailsText, fallback) {
  if (!detailsText) return fallback;

  const phoneNumberMatch = detailsText.match(/Recharge phone: (\d+)/);
  return phoneNumberMatch ? phoneNumberMatch[1] : fallback;
}
