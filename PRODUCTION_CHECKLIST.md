# 🚀 Production Deployment Checklist - Kashier Payment Integration

## 📋 Pre-Deployment Checklist

### ✅ Environment Variables

- [ ] Set `KASHIER_MODE=live` in production environment
- [ ] Configure live Kashier API credentials:
  - `KASHIER_PAYMENT_API_KEY` (Live Payment API Key)
  - `KASHIER_SECRET_KEY` (Live Secret Key)
  - `KASHIER_MERCHANT_ID` (Live Merchant ID)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `FRONTEND_URL` for production domain
- [ ] Set `PORT` for production server
- [ ] Configure `LOG_LEVEL=info` or `warn` for production

### ✅ Security Configuration

- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins for production domain
- [ ] Set up rate limiting for production traffic
- [ ] Enable Helmet security headers
- [ ] Configure Content Security Policy for production
- [ ] Set up proper session management

### ✅ Kashier Production Setup

- [ ] Complete Kashier merchant verification
- [ ] Configure webhook URL for production domain
- [ ] Test webhook signature validation in live mode
- [ ] Verify redirect URLs for production
- [ ] Set up proper error handling for live transactions

### ✅ Database & Storage

- [ ] Set up production database (if using)
- [ ] Configure session storage for production
- [ ] Set up proper logging and monitoring
- [ ] Configure backup strategies

### ✅ Frontend Production Build

- [ ] Build frontend for production: `npm run build`
- [ ] Configure production API endpoints
- [ ] Test payment flow in production build
- [ ] Verify mobile responsiveness

## 🔧 Production Configuration

### Environment Variables Template

```bash
# Production Environment
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Kashier Live Configuration
KASHIER_MODE=live
KASHIER_PAYMENT_API_KEY=your_live_payment_api_key
KASHIER_SECRET_KEY=your_live_secret_key
KASHIER_MERCHANT_ID=your_live_merchant_id

# Uquid Configuration
UQ_PUBLIC_KEY=your_uquid_public_key
UQ_SECRET_KEY=your_uquid_secret_key

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production URLs Configuration

- **Webhook URL**: `https://yourdomain.com/api/kashier/webhook`
- **Redirect URL**: `https://yourdomain.com/api/kashier/redirect`
- **Iframe URL**: `https://yourdomain.com/api/kashier/iframe/:sessionId`

## 🧪 Testing Checklist

### ✅ Kashier Integration Tests

- [ ] Test payment session creation
- [ ] Test payment completion flow
- [ ] Test webhook signature validation
- [ ] Test redirect handling
- [ ] Test error scenarios
- [ ] Test timeout handling

### ✅ Uquid Integration Tests

- [ ] Test product query
- [ ] Test order submission
- [ ] Test order confirmation
- [ ] Test error handling

### ✅ Frontend Tests

- [ ] Test payment initiation
- [ ] Test success/error handling
- [ ] Test mobile responsiveness
- [ ] Test iframe loading
- [ ] Test localStorage data persistence

## 📊 Monitoring & Logging

### ✅ Production Monitoring

- [ ] Set up application monitoring (PM2, New Relic, etc.)
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up payment transaction monitoring
- [ ] Configure uptime monitoring
- [ ] Set up performance monitoring

### ✅ Logging Configuration

- [ ] Configure structured logging
- [ ] Set up log aggregation
- [ ] Configure log rotation
- [ ] Set up alerting for critical errors

## 🔒 Security Checklist

### ✅ Payment Security

- [ ] Verify HMAC signature validation
- [ ] Test webhook security
- [ ] Validate all payment data
- [ ] Test rate limiting
- [ ] Verify CORS configuration

### ✅ Application Security

- [ ] Enable HTTPS only
- [ ] Configure security headers
- [ ] Validate input data
- [ ] Test SQL injection protection
- [ ] Verify XSS protection

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Set production environment variables
export NODE_ENV=production
export KASHIER_MODE=live
# ... other variables
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Start Production Server

```bash
cd backend
npm start
# or using PM2
pm2 start ecosystem.config.js --env production
```

### 4. Verify Deployment

- [ ] Check server health: `GET /api/health`
- [ ] Test payment flow end-to-end
- [ ] Verify webhook functionality
- [ ] Check error handling

## 📈 Post-Deployment

### ✅ Monitoring

- [ ] Monitor payment success rates
- [ ] Track error rates
- [ ] Monitor response times
- [ ] Check webhook delivery rates

### ✅ Maintenance

- [ ] Regular security updates
- [ ] Monitor Kashier API changes
- [ ] Update dependencies regularly
- [ ] Backup data regularly

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving**: Check URL configuration and firewall
2. **Signature validation fails**: Verify API keys and signature algorithm
3. **Payment timeout**: Check network connectivity and Kashier status
4. **CORS errors**: Verify CORS configuration for production domain

### Emergency Contacts

- Kashier Support: [Kashier Support Portal]
- Uquid Support: [Uquid Support]
- Application Logs: Check server logs for detailed error information

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Status**: Ready for Production
