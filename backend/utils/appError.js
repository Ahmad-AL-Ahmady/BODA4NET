/**
 * appError.js
 *
 * Custom error class for handling application-specific errors
 * Extends the built-in Error class with additional properties
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode; // Use the actual status code number
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
