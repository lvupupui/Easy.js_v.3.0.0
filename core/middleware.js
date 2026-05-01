const rateLimit = require('express-rate-limit');
const Logger = require('./logger');

class MiddlewareManager {
  static createRateLimiter(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: false,
      legacyHeaders: false,
    });
  }

  static createLoggingMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'error' : 'info';
        Logger[level](
          `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
        );
      });

      next();
    };
  }

  static createCorsMiddleware(origins = ['*']) {
    return (req, res, next) => {
      const origin = req.headers.origin;
      
      if (origins.includes('*') || origins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      }

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }

      next();
    };
  }

  static createRequestValidationMiddleware(rules) {
    return (req, res, next) => {
      // Sanitize inputs
      const sanitized = this.sanitizeObject(req.body || {});
      req.body = sanitized;
      next();
    };
  }

  static sanitizeObject(obj) {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  static createErrorHandlingMiddleware() {
    return (err, req, res, next) => {
      Logger.error(`Error: ${err.message}`);

      const status = err.status || 500;
      const message = err.message || 'Internal Server Error';

      res.status(status).json({
        success: false,
        error: message,
        ...(process.env.DEBUG && { stack: err.stack })
      });
    };
  }
}

module.exports = MiddlewareManager;
