# Payment Flow Documentation - Updated

## Overview

⚠️ **Important Notice**: The Sha7nawy payment service has been removed from this system.
The payment flow documentation below is preserved for reference, but the payment endpoints are currently disabled.

## Previous Payment Flow Sequence (Sha7nawy - Removed)

### 1. Check for Item Using Price (Uquid Product Validation)

- **Endpoint**: `POST /api/payment/create` (Currently returns 501 - Service Unavailable)
- **Action**: Queries Uquid API for Vodafone Egypt products
- **Validation**: Ensures the requested amount has a corresponding product available
- **Error Handling**: Returns error if no suitable product is found

### 2. Check Uquid Balance

- **Action**: Calls `queryAccountBalance` API
- **Validation**: Ensures sufficient USDT balance for the transaction
- **Error Handling**: Returns error if insufficient balance

### 3. Payment Integration (Removed)

- **Previous Action**: Created payment request with Sha7nawy
- **Current Status**: Payment service removed, integration needed for new provider
- **Required**: Implement new payment gateway integration

### 4. Payment Processing (Disabled)

- **Endpoint**: `POST /api/payment/check-and-process` (Currently returns 501 - Service Unavailable)
- **Previous Process**:
  1. Confirm payment status
  2. If successful, submit order to Uquid
  3. Confirm Uquid order
  4. Complete transaction

## API Endpoints

### Payment Creation

```http
POST /api/payment/create
Content-Type: application/json

{
  "phoneNumber": "01012345678",
  "amount": 20
}
```

**Note**: Minimum amount is now 8 EGP (previously 5 EGP) as there are no API calls available for 5 EGP.

````

**Response**:

```json
{
  "success": true,
  "message": "Payment created successfully",
  "reference": "REF123456",
  "paymentId": "PAY123456",
  "topUpAmount": 20,
  "serviceFee": 4,
  "totalAmount": 24,
  "uquidProduct": {...},
  "uquidBalance": 100
}
````

### Payment Processing

```http
POST /api/payment/check-and-process
Content-Type: application/json

{
  "paymentId": "PAY123456",
  "reference": "REF123456"
}
```

### Balance Check

```http
GET /api/account/balance
```

### Product Availability Check

```http
GET /api/uquid/products/check/{amount}
```

## Error Handling

### Common Error Scenarios

1. **Insufficient Balance**: Uquid account doesn't have enough USDT
2. **Product Not Found**: No Vodafone Egypt product available for the requested amount
3. **Payment Failed**: Payment was rejected or failed (payment service removed)
4. **Order Failed**: Uquid order submission or confirmation failed

### Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

## Frontend Integration

### Enhanced User Experience

- Shows loading states during each step
- Displays progress indicators
- Provides detailed success/error messages
- Automatic retry mechanism for pending payments

### User Flow

1. User enters phone number and amount
2. System shows "Checking product and balance" message
3. If successful, shows payment instructions with reference code
4. Automatically checks payment status every 10 seconds
5. Shows detailed success message with transaction details

## Testing

### Test Script

Run the test script to verify the new flow:

```bash
node backend/test-payment-flow.js
```

### Manual Testing

1. Test with valid phone number and amount
2. Test with insufficient balance
3. Test with unavailable product amount
4. Test payment confirmation flow

## Security Considerations

- All API calls are rate-limited
- Input validation on all endpoints
- Secure API key handling
- Error messages don't expose sensitive information

## Monitoring

### Log Messages

The system logs detailed information for each step:

- `[PAYMENT FLOW] Starting new payment flow`
- `[UQUID] Step 1: Checking for product`
- `[UQUID] Step 2: Checking account balance`
- `[PAYMENT] Step 3: Payment service integration required`
- `[UQUID] Step 4: Processing top-up after payment confirmation`

### Health Check

The health check endpoint (`/api/health`) monitors Uquid service availability. Payment service monitoring removed with sha7nawy.

## Configuration

### Environment Variables

- `UQ_PUBLIC_KEY`: Uquid API public key
- `UQ_SECRET_KEY`: Uquid API secret key
- Payment gateway credentials: Add credentials for your new payment provider (sha7nawy removed)

## Future Enhancements

1. **Database Integration**: Store transaction details for better tracking
2. **Caching**: Cache product information to reduce API calls
3. **Webhooks**: Implement webhook support for real-time status updates
4. **Retry Logic**: Implement exponential backoff for failed operations
5. **Analytics**: Add transaction analytics and reporting
