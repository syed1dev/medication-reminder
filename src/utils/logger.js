/**
 * Structured logger for the application
 * Provides consistent log format with proper context
 * 
 * @module utils/logger
 */

/**
 * Log levels
 */
const LogLevels = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
  };
  
  /**
   * Minimum log level to display based on environment
   */
  const getMinLogLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        return LogLevels.INFO;
      case 'test':
        return LogLevels.ERROR;
      default:
        return LogLevels.DEBUG;
    }
  };
  
  /**
   * Determines if a log level should be displayed
   * 
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether this level should be logged
   */
  const shouldLog = (level) => {
    const levels = Object.values(LogLevels);
    const minLevel = getMinLogLevel();
    
    return levels.indexOf(level) <= levels.indexOf(minLevel);
  };
  
  /**
   * Format log data as JSON
   * 
   * @param {Object} data - Log data
   * @returns {string} - Formatted log string
   */
  const formatLog = (data) => {
    const logData = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Remove null or undefined values
    Object.keys(logData).forEach(key => {
      if (logData[key] === null || logData[key] === undefined) {
        delete logData[key];
      }
    });
    
    return JSON.stringify(logData);
  };
  
  /**
   * Log an error message
   * 
   * @param {Object|string} data - Error data or message
   */
  const error = (data) => {
    if (shouldLog(LogLevels.ERROR)) {
      const logData = typeof data === 'string' ? { message: data } : data;
      console.error(formatLog({ level: LogLevels.ERROR, ...logData }));
    }
  };
  
  /**
   * Log a warning message
   * 
   * @param {Object|string} data - Warning data or message
   */
  const warn = (data) => {
    if (shouldLog(LogLevels.WARN)) {
      const logData = typeof data === 'string' ? { message: data } : data;
      console.warn(formatLog({ level: LogLevels.WARN, ...logData }));
    }
  };
  
  /**
   * Log an info message
   * 
   * @param {Object|string} data - Info data or message
   */
  const info = (data) => {
    if (shouldLog(LogLevels.INFO)) {
      const logData = typeof data === 'string' ? { message: data } : data;
      console.info(formatLog({ level: LogLevels.INFO, ...logData }));
    }
  };
  
  /**
   * Log a debug message
   * 
   * @param {Object|string} data - Debug data or message
   */
  const debug = (data) => {
    if (shouldLog(LogLevels.DEBUG)) {
      const logData = typeof data === 'string' ? { message: data } : data;
      console.debug(formatLog({ level: LogLevels.DEBUG, ...logData }));
    }
  };
  
  module.exports = {
    error,
    warn,
    info,
    debug,
    LogLevels
  };