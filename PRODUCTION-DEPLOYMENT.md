# BODA4NET Production Deployment Guide

## 🚀 Production-Ready Features Added

### ✅ Security Enhancements

- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **Rate Limiting**: 100 requests per 15 minutes
- **Speed Limiting**: Progressive delays after 5 requests
- **Input Validation**: Express-validator for all endpoints
- **CORS Protection**: Configurable allowed origins
- **API Key Validation**: Middleware to ensure all keys are present

### ✅ Performance Optimizations

- **Gzip Compression**: Automatic response compression
- **Bundle Optimization**: Code splitting and minification
- **Memory Management**: Graceful shutdown handling
- **Static File Caching**: Optimized asset serving
- **Terser Minification**: Console.log removal in production

### ✅ Monitoring & Logging

- **Winston Logger**: Structured logging with levels
- **Request Logging**: All API requests tracked
- **Transaction Logging**: Payment/top-up events logged
- **Health Checks**: Comprehensive service status
- **Error Tracking**: Detailed error logging with context

### ✅ Production Configuration

- **Environment Variables**: Complete .env.example
- **Docker Support**: Multi-stage optimized Dockerfile
- **PM2 Configuration**: Cluster mode with auto-restart
- **Build Scripts**: Production-optimized build process

## 📋 Deployment Options

### Option 1: Railway (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Production-ready deployment"
git push origin main

# 2. Connect to Railway
# - Go to railway.app
# - Connect GitHub repository
# - Set environment variables
# - Deploy automatically

# 3. Environment Variables for Railway:
NODE_ENV=production
UQ_PUBLIC_KEY=your_uquid_key
UQ_SECRET_KEY=your_uquid_secret
SHA7NAWY_PUBLIC_KEY=your_sha7nawy_key
SHA7NAWY_SECRET_KEY=your_sha7nawy_secret
CORS_ORIGIN=https://yourdomain.com
```

### Option 2: DigitalOcean Droplet

```bash
# 1. Create $12/month droplet (2GB RAM)
# 2. SSH into server
ssh root@your-server-ip

# 3. Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
npm install -g pm2

# 4. Clone and setup
git clone https://github.com/yourusername/BODA4NET.git
cd BODA4NET
npm run prod:build

# 5. Configure environment
cp backend/.env.example backend/.env
nano backend/.env  # Add your API keys

# 6. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# 7. Setup Nginx (optional)
apt install nginx
# Configure reverse proxy to port 3001
```

### Option 3: Docker Deployment

```bash
# 1. Build image
npm run docker:build

# 2. Create .env file
cp backend/.env.example backend/.env
# Edit with your production values

# 3. Start with Docker Compose
npm run docker:up

# 4. Check health
curl http://localhost:3001/api/health
```

### Option 4: Heroku

```bash
# 1. Install Heroku CLI
# 2. Create app
heroku create boda4net-app

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set UQ_PUBLIC_KEY=your_key
heroku config:set UQ_SECRET_KEY=your_secret
heroku config:set SHA7NAWY_PUBLIC_KEY=your_key
heroku config:set SHA7NAWY_SECRET_KEY=your_secret

# 4. Deploy
git push heroku main
```

## 🔧 Environment Variables (Required)

Create `backend/.env` with these values:

```env
# Environment
NODE_ENV=production
PORT=3001

# API Keys (REQUIRED)
UQ_PUBLIC_KEY=your_uquid_public_key
UQ_SECRET_KEY=your_uquid_secret_key
SHA7NAWY_PUBLIC_KEY=your_sha7nawy_public_key
SHA7NAWY_SECRET_KEY=your_sha7nawy_secret_key

# Security
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your_secure_random_string

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## 🔍 Production Monitoring

### Health Check Endpoint

```bash
curl https://yourdomain.com/api/health
```

Response includes:

- Server status and uptime
- Memory usage
- External service connectivity (Uquid, Sha7nawy)
- Environment information

### Log Monitoring

```bash
# PM2 logs
pm2 logs boda4net

# Docker logs
docker logs boda4net

# File logs (if configured)
tail -f logs/error.log
tail -f logs/combined.log
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check memory usage
pm2 show boda4net
```

## 🛡️ Security Checklist

- ✅ Environment variables secured
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ Input validation active
- ✅ CORS properly configured
- ✅ Error messages sanitized
- ✅ Logging without sensitive data
- ✅ HTTPS enforced (via proxy/platform)

## 🚀 Custom Domain Setup

### Railway

1. Go to Railway dashboard
2. Click your service → Settings → Domains
3. Add custom domain
4. Update DNS records as shown

### DigitalOcean with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Production Scripts

```bash
# Production build
npm run prod:build

# Production start
npm run prod:start

# Health check
npm run health

# Docker operations
npm run docker:build
npm run docker:up
npm run docker:down
```

## 🔧 Troubleshooting

### Common Issues

1. **Failed to fetch errors**

   - Check CORS_ORIGIN environment variable
   - Verify API endpoints are using production URLs

2. **Rate limiting issues**

   - Adjust RATE_LIMIT_MAX_REQUESTS if needed
   - Check logs for rate limit violations

3. **Memory issues**

   - Monitor with `pm2 monit`
   - Consider upgrading server resources

4. **API failures**
   - Check health endpoint
   - Verify external API connectivity
   - Review error logs

### Performance Optimization

1. **Enable CDN** for static assets
2. **Database caching** if adding persistence
3. **Load balancing** for high traffic
4. **SSL/TLS optimization**

## 📱 Mobile Optimization

The app is already optimized for mobile with:

- Responsive design
- Touch-friendly interfaces
- Fast loading times
- Optimized bundle sizes

## 🔄 CI/CD Pipeline (Optional)

For automated deployments, consider:

- GitHub Actions
- GitLab CI/CD
- Railway auto-deploys
- Heroku auto-deploys

Your BODA4NET application is now production-ready with enterprise-grade security, monitoring, and performance optimizations! 🎉
