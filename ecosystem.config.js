// PM2 ecosystem configuration for production deployment
module.exports = {
  apps: [
    {
      name: "boda4net",
      script: "backend/server.js",
      cwd: "./",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        LOG_LEVEL: "info",
      },
      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,

      // Monitoring
      max_memory_restart: "1G",

      // Auto-restart on file changes (development only)
      watch: false,
      ignore_watch: ["node_modules", "logs", "dist"],

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
  ],
};
