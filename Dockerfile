# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production --silent
RUN cd frontend && npm ci --only=production --silent
RUN cd backend && npm ci --only=production --silent

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Copy backend files and built frontend
COPY --from=builder --chown=backend:nodejs /app/backend ./backend
COPY --from=builder --chown=backend:nodejs /app/frontend/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/backend/node_modules ./backend/node_modules

# Create logs directory
RUN mkdir -p /app/logs && chown backend:nodejs /app/logs

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]