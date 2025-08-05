# BODA4NET - Vodafone Top-up System

## Project Overview

BODA4NET is a full-stack web application for Vodafone Egypt mobile top-ups and home internet recharges. The system integrates with Sha7nawy payment gateway for payments and Uquid API for mobile top-ups.

## Architecture

- **Frontend**: React.js with Vite, TailwindCSS, and Shadcn/ui components
- **Backend**: Node.js/Express.js server with RESTful API
- **Payment Integration**: Sha7nawy payment gateway (*9*1# USSD)
- **Top-up Service**: Uquid API for Vodafone Egypt mobile recharges
- **UI Framework**: Shadcn/ui component library with TailwindCSS styling

## Project Structure

### Frontend (`/src/`)

```
src/
├── App.jsx                 # Main React component with balance & internet recharge UI
├── InvoicePage.jsx         # Invoice/payment confirmation page
├── main.jsx               # React application entry point
├── index.css              # Global styles
├── App.css               # Application-specific styles
├── components/ui/         # 47 Shadcn/ui components (buttons, inputs, etc.)
├── lib/utils.js          # Utility functions
├── hooks/use-mobile.js   # Mobile device detection hook
└── config/               # Configuration files
```

### Backend (`/backend/`)

```
backend/
├── server.js             # Express server with all API endpoints
├── package.json          # Backend dependencies
└── package-lock.json    # Backend dependency lock file
```

### Configuration Files

```
├── vite.config.js        # Vite build configuration
├── components.json       # Shadcn/ui component configuration
├── jsconfig.json         # JavaScript project configuration
├── eslint.config.js      # ESLint configuration
├── package.json          # Main project dependencies
├── pnpm-lock.yaml       # PNPM lock file
└── index.html           # HTML entry point
```

## Key Features

### Mobile Top-up Service

- Validates Vodafone Egypt numbers (010xxxxxxxx)
- Supports amounts from 5-1000 EGP
- 20% service fee calculation
- Real-time payment status checking
- Automatic top-up processing via Uquid API

### Internet Package Recharge

- Support for landline numbers (currently UI only)
- Internet packages: 140GB, 250GB, 400GB, 600GB
- Pricing: 140 EGP, 200 EGP, 300 EGP, 400 EGP respectively

### Payment Flow

1. User selects phone number and amount
2. System generates invoice with 20% service fee
3. Creates Sha7nawy payment request
4. User pays via *9*1# USSD code
5. System automatically checks payment status every 10 seconds
6. Upon successful payment, triggers Uquid top-up
7. Displays success confirmation

## Dependencies

### Frontend Dependencies

- **React**: ^19.1.0 - UI framework
- **React Router DOM**: ^7.6.1 - Client-side routing
- **Vite**: ^6.3.5 - Build tool and dev server
- **TailwindCSS**: ^4.1.7 - CSS framework
- **Shadcn/ui Components**: Comprehensive UI component library
- **SweetAlert2**: ^11.22.2 - Beautiful alert dialogs
- **Framer Motion**: ^12.15.0 - Animation library
- **Lucide React**: ^0.510.0 - Icon library

### Backend Dependencies

- **Express**: ^4.19.2 - Web framework
- **CORS**: ^2.8.5 - Cross-origin resource sharing
- **Axios**: ^1.7.2 - HTTP client
- **dotenv**: ^17.2.1 - Environment variable management

## API Endpoints

### Payment Management

- `POST /api/payment/create` - Create Sha7nawy payment request
- `POST /api/payment/check-and-process` - Check payment & process top-up
- `GET /api/payment/info/:transactionId` - Get payment information

### Vodafone Services

- `GET /api/vodafone/products` - Get available Vodafone products
- `POST /api/vodafone/submit-order` - Submit Vodafone order
- `POST /api/vodafone/confirm-order` - Confirm Vodafone order
- `GET /api/vodafone/order-status/:batchId` - Check order status

### Utility

- `GET /api/account/balance` - Get Uquid account balance
- `GET /api/health` - Health check endpoint

## Environment Variables Required

### Backend Environment Variables (`.env` in `/backend/`)

```env
PORT=3001
UQ_PUBLIC_KEY=your_uquid_public_key
UQ_SECRET_KEY=your_uquid_secret_key
SHA7NAWY_PUBLIC_KEY=your_sha7nawy_public_key
SHA7NAWY_SECRET_KEY=your_sha7nawy_secret_key
```

## Build & Development Scripts

### Frontend Scripts

- `npm run dev` - Start Vite development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts

- `npm run backend` - Start backend development server
- `npm run start` - Build frontend & start backend in production
- `npm run dev:full` - Start both frontend and backend concurrently

## Deployment Instructions

### Prerequisites

1. Node.js 18+ installed
2. npm or pnpm package manager
3. Uquid API credentials
4. Sha7nawy payment gateway credentials

### Local Development Deployment

1. **Clone and Install Dependencies**

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

2. **Environment Configuration**

```bash
# Create backend environment file
cd backend
cp .env.example .env
# Edit .env with your API credentials
```

3. **Start Development Servers**

```bash
# Option 1: Start both servers simultaneously
npm run dev:full

# Option 2: Start servers separately
npm run dev          # Frontend on port 5173
npm run backend      # Backend on port 3001
```

### Production Deployment

#### Option 1: Traditional VPS/Server

1. **Build the Application**

```bash
npm install
npm run build
cd backend && npm install --production
```

2. **Set Environment Variables**

```bash
# Create .env file in backend directory
cd backend
nano .env
# Add your production API keys
```

3. **Start Production Server**

```bash
npm run start
# or
cd backend && npm start
```

4. **Use Process Manager (Recommended)**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start backend/server.js --name "boda4net"
pm2 startup
pm2 save
```

5. **Nginx Configuration** (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: Docker Deployment

1. **Create Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "start"]
```

2. **Build and Run**

```bash
docker build -t boda4net .
docker run -p 3001:3001 --env-file backend/.env boda4net
```

#### Option 3: Vercel/Netlify (Frontend Only)

For frontend-only deployment, you'll need to:

1. Deploy backend separately (Railway, Heroku, DigitalOcean)
2. Update API endpoints in frontend code
3. Build and deploy frontend to Vercel/Netlify

### Cloud Platform Deployment

#### Heroku

1. **Create Heroku Apps**

```bash
# Create app
heroku create boda4net-backend

# Set environment variables
heroku config:set UQ_PUBLIC_KEY=your_key -a boda4net-backend
heroku config:set UQ_SECRET_KEY=your_secret -a boda4net-backend
heroku config:set SHA7NAWY_PUBLIC_KEY=your_key -a boda4net-backend
heroku config:set SHA7NAWY_SECRET_KEY=your_secret -a boda4net-backend

# Deploy
git push heroku main
```

#### Railway

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build commands:
   - Build: `npm install && npm run build && cd backend && npm install`
   - Run: `cd backend && npm start`
3. Set environment variables
4. Deploy

### Database Considerations

Currently, the application doesn't use a persistent database. For production use, consider adding:

- **Redis** for session management and caching
- **PostgreSQL/MySQL** for transaction logging
- **MongoDB** for user preferences and history

### Security Recommendations

1. Use HTTPS in production
2. Implement rate limiting
3. Add request validation middleware
4. Use environment variables for all secrets
5. Implement proper error handling
6. Add logging for all transactions
7. Regular security updates

### Monitoring & Maintenance

1. **Application Monitoring**

   - Use PM2 monitoring for process health
   - Implement health check endpoints
   - Set up log rotation

2. **API Monitoring**

   - Monitor Uquid API usage and limits
   - Track Sha7nawy payment success rates
   - Set up alerting for failed transactions

3. **Performance Optimization**
   - Enable gzip compression
   - Implement caching strategies
   - Monitor response times
   - Optimize bundle sizes

### Troubleshooting Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for your frontend domain
2. **API Failures**: Check environment variables and API credentials
3. **Build Failures**: Verify Node.js version compatibility
4. **Payment Issues**: Verify Sha7nawy credentials and network connectivity
5. **Top-up Failures**: Check Uquid API status and account balance

### Support & Maintenance

- **Frontend**: Modern React application with component-based architecture
- **Backend**: RESTful API with comprehensive error handling
- **Documentation**: Inline code comments and API documentation
- **Testing**: Ready for unit and integration test implementation

This application is production-ready with proper error handling, user feedback, and comprehensive payment flow management.
