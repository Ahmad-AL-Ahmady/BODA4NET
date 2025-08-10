# Idempotency Fix for UQ Recharge Requests

## Problem

The UQ recharge request was running multiple times after confirmation from sha7nawy, causing duplicate charges. For example, a 10 EGP recharge could result in 20 EGP being charged due to duplicate processing.

## Root Cause

1. **Frontend Polling**: The frontend used `setInterval` to poll the `/api/payment/check-and-process` endpoint
2. **No Idempotency Protection**: The backend had no mechanism to prevent duplicate processing of the same payment
3. **Race Conditions**: Network delays or user actions could cause multiple requests for the same transaction

## Solution Implemented

### 1. Backend Changes (`backend/server.js`)

#### Added Transaction Tracking

```javascript
// In-memory transaction tracking to prevent duplicate processing
const processedTransactions = new Map();

// Helper function to check if transaction was already processed
const isTransactionProcessed = (paymentId, reference) => {
  const key = `${paymentId}-${reference}`;
  return processedTransactions.has(key);
};

// Helper function to mark transaction as processed
const markTransactionProcessed = (paymentId, reference) => {
  const key = `${paymentId}-${reference}`;
  processedTransactions.set(key, {
    timestamp: new Date().toISOString(),
    processed: true,
  });

  // Clean up old entries after 24 hours to prevent memory leaks
  setTimeout(() => {
    processedTransactions.delete(key);
  }, 24 * 60 * 60 * 1000);
};
```

#### Added Idempotency Check

```javascript
// Check if this transaction was already processed
if (isTransactionProcessed(paymentId, reference)) {
  logger.warn(`[TRANSACTION] ⚠️ Duplicate transaction attempt:`, {
    paymentId,
    reference,
    timestamp: new Date().toISOString(),
  });

  return res.status(409).json({
    success: false,
    message:
      "This payment has already been processed. Duplicate request ignored.",
    duplicate: true,
  });
}
```

#### Mark Transaction as Processed

```javascript
// Mark transaction as processed to prevent duplicates
markTransactionProcessed(paymentId, reference);
```

### 2. Frontend Changes (`frontend/src/App.jsx`)

#### Added Duplicate Response Handling

```javascript
if (response.status === 409 && data.duplicate) {
  // Payment was already processed, treat as success
  clearInterval(checkInterval);
  clearTimeout(timeout);
  setPaymentStep("completed");
  Swal.fire({
    icon: "info",
    title: "تم معالجة الدفع مسبقاً",
    text: "هذا الدفع تم معالجته بنجاح من قبل. لا داعي للقلق.",
    confirmButtonText: "حسناً",
  });

  // Reset form
  setShowInvoice(false);
  setPhoneNumber("");
  setAmount("");
  resetPaymentFlow();
  return;
}
```

#### Added Timeout Protection

```javascript
// Add timeout to prevent infinite polling (5 minutes)
const timeout = setTimeout(() => {
  clearInterval(checkInterval);
  setError("انتهت مهلة التحقق من الدفع. يرجى المحاولة مرة أخرى.");
  setPaymentStep("invoice");
  Swal.fire({
    icon: "warning",
    title: "انتهت المهلة",
    text: "انتهت مهلة التحقق من الدفع. يرجى المحاولة مرة أخرى.",
    confirmButtonText: "حسناً",
  });
}, 5 * 60 * 1000); // 5 minutes
```

## How It Works

1. **First Request**: When a payment is processed for the first time:

   - System checks if payment was already processed
   - If not, processes the payment normally
   - Marks the transaction as processed using `paymentId + reference` as key

2. **Duplicate Request**: When the same payment is requested again:

   - System detects it's already processed
   - Returns HTTP 409 (Conflict) with `duplicate: true`
   - Frontend shows success message instead of error

3. **Memory Management**: Processed transactions are automatically cleaned up after 24 hours to prevent memory leaks.

## Testing

Run the test script to verify the fix:

```bash
cd backend
node test-idempotency-simple.js
```

**Note**: This test script uses only built-in Node.js modules and doesn't require any additional dependencies.

If you prefer to use the fetch-based test script (requires Node.js 18+ or node-fetch):

```bash
cd backend
node test-idempotency.js
```

## Benefits

1. **Prevents Duplicate Charges**: Same payment cannot be processed twice
2. **Better User Experience**: Users see success message even for duplicate requests
3. **Memory Efficient**: Automatic cleanup prevents memory leaks
4. **Logging**: All duplicate attempts are logged for monitoring
5. **Timeout Protection**: Prevents infinite polling

## Future Improvements

1. **Database Storage**: Replace in-memory storage with database for persistence across server restarts
2. **Redis Integration**: Use Redis for distributed transaction tracking
3. **Webhook Support**: Implement webhooks for real-time status updates
4. **Retry Logic**: Add exponential backoff for failed operations
