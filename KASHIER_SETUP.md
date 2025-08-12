# Kashier Payment Gateway Integration Setup

This document explains how to set up and configure the Kashier payment gateway integration for the BODA4NET application.

## Overview

The application now uses Kashier as the primary payment gateway instead of the test mode. Kashier provides:

- Secure payment processing
- Multiple payment methods (cards, wallets, bank installments, Fawry)
- Webhook notifications for payment status
- Iframe integration for seamless user experience

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Kashier Payment Gateway Configuration
KASHIER_PAYMENT_API_KEY=your_kashier_payment_api_key_here
KASHIER_SECRET_KEY=your_kashier_secret_key_here
KASHIER_MERCHANT_ID=your_kashier_merchant_id_here
KASHIER_MODE=test  # or 'live' for production
```

## Getting Kashier Credentials

1. **Sign up for Kashier**: Visit [Kashier's website](https://kashier.io) and create a merchant account
2. **Get API Keys**: From your Kashier dashboard, navigate to the Integrations section
3. **Merchant ID**: Your merchant ID will be in the format `MID-XXX-XXX`
4. **Payment API Key**: This is your payment API key for session creation
5. **Secret Key**: This is your secret key for hash generation and signature validation

## Configuration

### Test Mode vs Live Mode

- **Test Mode** (`KASHIER_MODE=test`): Use for development and testing
- **Live Mode** (`KASHIER_MODE=live`): Use for production transactions

### Webhook Configuration

The application automatically configures webhooks at:

- **Webhook URL**: `https://your-domain.com/api/kashier/webhook`
- **Redirect URL**: `https://your-domain.com/api/kashier/redirect`

## Payment Flow

1. **User selects amount and phone number**
2. **Frontend calls backend** to create payment session
3. **Backend creates Kashier session** and returns session URL
4. **Frontend opens iframe** with Kashier payment form
5. **User completes payment** through Kashier
6. **Kashier sends webhook** to backend with payment status
7. **Backend processes Uquid recharge** if payment is successful
8. **User is redirected** back to frontend with success/error status

## API Endpoints

### Create Payment Session

```
POST /api/kashier/create-session
Content-Type: application/json

{
  "phoneNumber": "01012345678",
  "vodafoneCashNumber": "01012345678",
  "amount": 100
}
```

### Webhook Endpoint

```
POST /api/kashier/webhook
Headers: x-kashier-signature: <signature>
Body: Kashier webhook payload
```

### Redirect Endpoint

```
GET /api/kashier/redirect?paymentStatus=SUCCESS&merchantOrderId=...
```

### Session Status

```
GET /api/kashier/session/:sessionId/status
```

## Security Features

1. **Signature Validation**: All webhooks and redirects are validated using HMAC SHA256
2. **Order Hash**: Each payment request generates a unique hash for validation
3. **Session Management**: Payment sessions are tracked and validated
4. **Webhook Verification**: Server-to-server notifications are cryptographically verified

## Testing

### Test Cards

Use Kashier's test cards for development:

- **Visa**: 4111111111111111
- **Mastercard**: 5555555555554444
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### Test Mode Features

- No real money is charged
- All payment methods are available
- Webhooks work normally
- Perfect for development and testing

## Production Deployment

1. **Switch to Live Mode**: Set `KASHIER_MODE=live`
2. **Update API Keys**: Use production Kashier credentials
3. **Configure Webhooks**: Ensure webhook URLs are publicly accessible
4. **SSL Certificate**: Ensure your domain has valid SSL certificate
5. **Test Thoroughly**: Test the complete payment flow in production mode

## Troubleshooting

### Common Issues

1. **Webhook Not Received**

   - Check if your server is publicly accessible
   - Verify webhook URL is correct in Kashier dashboard
   - Check server logs for webhook processing errors

2. **Signature Validation Failed**

   - Verify secret key is correct
   - Check if webhook payload structure matches expected format
   - Ensure signature generation logic is correct

3. **Payment Session Creation Failed**

   - Verify merchant ID, payment API key, and secret key
   - Check if all required parameters are provided
   - Ensure redirect and webhook URLs are valid

4. **Iframe Not Loading**
   - Check if domain is allowed in Kashier settings
   - Verify session URL is valid
   - Check browser console for CORS errors

### Logs

The application logs all Kashier-related activities:

- Payment session creation
- Webhook processing
- Signature validation
- Payment processing
- Error handling

Check the logs for detailed information about any issues.

## Support

For Kashier-specific issues:

- Kashier Documentation: [https://docs.kashier.io](https://docs.kashier.io)
- Kashier Support: Contact Kashier support team

For application-specific issues:

- Check the application logs
- Review the code documentation
- Contact the development team
