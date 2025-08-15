/**
 * catchAsync.js
 * 
 * Utility function to catch async errors and pass them to Express error handling middleware
 * This eliminates the need for try-catch blocks in every async route handler
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;

