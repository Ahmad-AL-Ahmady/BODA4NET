# Setup Guide

## Environment Configuration

The application requires API keys for Uquid and Sha7nawy services. Follow these steps to configure them:

### 1. Create Environment File

Copy the example environment file:

```bash
cd backend
cp env.example .env
```

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

```env
# Uquid API Configuration
UQ_PUBLIC_KEY=your_uquid_public_key_here
UQ_SECRET_KEY=your_uquid_secret_key_here

# Sha7nawy API Configuration
SHA7NAWY_PUBLIC_KEY=your_sha7nawy_public_key_here
SHA7NAWY_SECRET_KEY=your_sha7nawy_secret_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API Keys (for middleware validation)
API_KEY=your_api_key_here
```

### 3. Get API Keys

#### Uquid API Keys

1. Sign up at [Uquid](https://uquid.com)
2. Navigate to your account settings
3. Generate API keys for your account
4. Copy the public and secret keys to your `.env` file

#### Sha7nawy API Keys

1. Sign up at [Sha7nawy](https://sha7nawy.com)
2. Navigate to your account settings
3. Generate API keys for your account
4. Copy the public and secret keys to your `.env` file

### 4. Test Configuration

Run the debug script to test your API configuration:

```bash
cd backend
node debug-uquid.js
```

### 5. Start the Server

```bash
cd backend
npm start
```

### 6. Test the Payment Flow

```bash
cd backend
node test-payment-flow.js
```

## Troubleshooting

### Missing API Keys Error

If you see "credentials not configured" errors:

1. Make sure you have created a `.env` file in the backend directory
2. Verify that all API keys are correctly set
3. Restart the server after making changes

### API Connection Issues

If the debug script fails:

1. Check your internet connection
2. Verify that your API keys are correct
3. Ensure your accounts have sufficient balance
4. Check if the API services are operational

### Server Won't Start

1. Make sure all dependencies are installed: `npm install`
2. Check that the PORT is not already in use
3. Verify that the `.env` file exists and is properly formatted

## Development vs Production

- **Development**: Uses localhost URLs and development settings
- **Production**: Uses production URLs and optimized settings

Make sure to update the CORS_ORIGIN and other settings accordingly for your deployment environment.
