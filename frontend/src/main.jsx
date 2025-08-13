import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Disable console logging in production to prevent sensitive data exposure
if (import.meta.env.PROD) {
  // Override console methods to prevent logging sensitive data
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  // Filter out sensitive URLs and data
  const sensitivePatterns = [
    /kashier\.io/,
    /merchantId=/,
    /customerReference=/,
    /order=/,
    /phoneNumber=/,
    /amount=/,
    /reference=/,
  ];

  const shouldBlock = (message) => {
    if (typeof message === "string") {
      return sensitivePatterns.some((pattern) => pattern.test(message));
    }
    return false;
  };

  console.error = (...args) => {
    if (!shouldBlock(args[0])) {
      originalConsoleError.apply(console, args);
    }
  };

  console.warn = (...args) => {
    if (!shouldBlock(args[0])) {
      originalConsoleWarn.apply(console, args);
    }
  };

  console.log = (...args) => {
    if (!shouldBlock(args[0])) {
      originalConsoleLog.apply(console, args);
    }
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
