# BODA4NET - Vodafone Top-up System

## Project Overview

BODA4NET is a full-stack web application for Vodafone Egypt mobile top-ups and home internet recharges. The system integrates with Uquid API for mobile top-ups.

## Architecture

- **Frontend**: React.js with Vite, TailwindCSS, and Shadcn/ui components
- **Backend**: Node.js/Express.js server with RESTful API
- **Payment Integration**: Payment gateway integration ready (sha7nawy removed)
- **Top-up Service**: Uquid API for Vodafone Egypt mobile recharges
- **UI Framework**: Shadcn/ui component library with TailwindCSS styling

## Project Structure

This project is organized into separate frontend and backend directories:

### Frontend (`/frontend/`)

```
frontend/
├── src/
│   ├── App.jsx                 # Main React component with balance & internet recharge UI
│   ├── InvoicePage.jsx         # Invoice/payment confirmation page
│   ├── main.jsx               # React application entry point
│   ├── index.css              # Global styles
│   ├── App.css               # Application-specific styles
│   ├── components/ui/         # 47 Shadcn/ui components (buttons, inputs, etc.)
│   ├── lib/utils.js          # Utility functions
│   ├── hooks/use-mobile.js   # Mobile device detection hook
│   └── config/               # Configuration files
├── public/               # Static assets
├── vite.config.js        # Vite build configuration
├── components.json       # Shadcn/ui component configuration
├── jsconfig.json         # JavaScript project configuration
├── eslint.config.js      # ESLint configuration
├── package.json          # Frontend dependencies
├── pnpm-lock.yaml       # PNPM lock file
└── index.html           # HTML entry point
```

### Backend (`/backend/`)

```
backend/
├── server.js             # Express server with all API endpoints
├── middleware/           # Express middleware
│   ├── logger.js         # Request logging middleware
│   └── security.js       # Security middleware
├── package.json          # Backend dependencies
└── package-lock.json    # Backend dependency lock file
```

### Root Configuration Files

```
├── package.json          # Root package.json with scripts for both frontend and backend
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Docker build configuration
├── ecosystem.config.js   # PM2 configuration for production
├── render.yaml          # Render.com deployment configuration
└── README.md           # This file
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
3. Payment service integration (payment provider removed)
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

- `POST /api/payment/create` - Create payment request (temporarily unavailable)
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
# SHA7NAWY_PUBLIC_KEY=your_sha7nawy_public_key (removed)
# SHA7NAWY_SECRET_KEY=your_sha7nawy_secret_key (removed)
```

## Build & Development Scripts

### Root Scripts (run from project root)

- `npm run dev` - Start both frontend and backend development servers concurrently
- `npm run frontend:dev` - Start Vite development server (port 5173)
- `npm run frontend:build` - Build frontend for production
- `npm run frontend:preview` - Preview frontend production build
- `npm run frontend:lint` - Run ESLint on frontend
- `npm run backend:dev` - Start backend development server (port 3001)
- `npm run backend:start` - Start backend in production mode
- `npm run build` - Build frontend for production
- `npm run start` - Build frontend & start backend in production
- `npm run install:all` - Install dependencies for both frontend and backend

### Frontend Scripts (run from `/frontend/` directory)

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts (run from `/backend/` directory)

- `npm run dev` - Start development server
- `npm start` - Start production server

## Deployment Instructions

### Prerequisites

1. Node.js 18+ installed
2. npm or pnpm package manager
3. Uquid API credentials
4. Payment gateway credentials (if using alternative to sha7nawy)

### Local Development Deployment

1. **Clone and Install Dependencies**

```bash
# Install all dependencies (frontend and backend)
npm run install:all

# Or install manually:
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

2. **Environment Configuration**

```bash
# Create backend environment file
cd backend
cp .env.example .env
# Edit .env with your API credentials

# Create frontend environment file (optional)
cd ../frontend
cp .env.example .env.local
# Edit .env.local if you need custom API URLs
```

**Environment Variables:**

**Frontend (`/frontend/.env.local`):**

- `VITE_API_BASE_URL` - Backend API URL (default: auto-detected)

**Backend (`/backend/.env`):**

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `API_BASE_URL` - Internal API base URL
- `CORS_ORIGIN` - Allowed frontend origins
- `FRONTEND_URL` - Main frontend URL
- `UQ_PUBLIC_KEY` & `UQ_SECRET_KEY` - Uquid API credentials
- Payment gateway credentials (sha7nawy removed, add your new payment provider credentials)

3. **Start Development Servers**

```bash
# Option 1: Start both servers simultaneously (recommended)
npm run dev

# Option 2: Start servers separately
npm run frontend:dev    # Frontend on port 5173
npm run backend:dev     # Backend on port 3001

# Option 3: Run from individual directories
cd frontend && npm run dev    # Frontend
cd backend && npm run dev     # Backend
```

### Production Deployment

#### Option 1: Traditional VPS/Server

1. **Build the Application**

```bash
# Install dependencies and build
npm run install:all
npm run build

# Or manually:
npm install
npm install --prefix frontend
npm install --prefix backend --production
npm run frontend:build
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
# heroku config:set SHA7NAWY_PUBLIC_KEY=your_key -a boda4net-backend (removed)
# heroku config:set SHA7NAWY_SECRET_KEY=your_secret -a boda4net-backend (removed)
# Add your new payment provider credentials here

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
   - Track payment success rates (for new payment provider)
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
4. **Payment Issues**: Verify payment gateway credentials and network connectivity
5. **Top-up Failures**: Check Uquid API status and account balance

### Support & Maintenance

- **Frontend**: Modern React application with component-based architecture
- **Backend**: RESTful API with comprehensive error handling
- **Documentation**: Inline code comments and API documentation
- **Testing**: Ready for unit and integration test implementation

This application is production-ready with proper error handling, user feedback, and comprehensive payment flow management.
