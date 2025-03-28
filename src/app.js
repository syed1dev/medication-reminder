/**
 * Main application entry point
 * 
 * This file initializes the Express server, loads middleware,
 * registers routes, and implements error handling.
 * 
 * @module app
 */
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const callRoutes = require('./routes/callRoutes');
const { errorHandler, AppError, ErrorTypes } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Initialize Express application
const app = express();

// Add request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || 
                    req.headers['x-correlation-id'] || 
                    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log response when completed
  res.on('finish', () => {
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime
    });
  });
  
  req._startTime = Date.now();
  next();
});

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.use('/api', callRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'medication-reminder'
  });
});

// Error handling - must be after all routes
app.use(errorHandler);

// Handle 404 errors
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, ErrorTypes.NOT_FOUND_ERROR));
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  // Close any open connections here
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error({
    message: 'Uncaught exception',
    error: error.message,
    stack: error.stack
  });
  
  // Give time for logs to be written before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    message: 'Unhandled promise rejection',
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;