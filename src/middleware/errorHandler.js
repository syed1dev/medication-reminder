/**
 * Centralized error handling middleware
 * Formats and standardizes error responses across the application
 * 
 * @module middleware/errorHandler
 */
const logger = require('../utils/logger');

/**
 * Standard error codes for the application
 */
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TWILIO_ERROR: 'TWILIO_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Maps error types to HTTP status codes
 */
const ErrorStatusCodes = {
  [ErrorTypes.VALIDATION_ERROR]: 400,
  [ErrorTypes.DATABASE_ERROR]: 500,
  [ErrorTypes.TWILIO_ERROR]: 502,
  [ErrorTypes.AUTHENTICATION_ERROR]: 401,
  [ErrorTypes.AUTHORIZATION_ERROR]: 403,
  [ErrorTypes.NOT_FOUND_ERROR]: 404,
  [ErrorTypes.INTERNAL_ERROR]: 500
};

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, details = null) {
    super(message);
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.statusCode = ErrorStatusCodes[type] || 500;
  }
}

/**
 * Central error handling middleware
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Generate a unique request ID if not already present
  const requestId = req.headers['x-request-id'] || 
                    req.headers['x-correlation-id'] || 
                    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Standardize the error
  const error = err instanceof AppError ? err : new AppError(
    err.message || 'An unexpected error occurred',
    ErrorTypes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
  
  // Log the error with context
  logger.error({
    requestId,
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    timestamp: error.timestamp,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  // Send standardized error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      type: error.type,
      message: error.message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { details: error.details })
    }
  });
};

module.exports = {
  errorHandler,
  AppError,
  ErrorTypes
};