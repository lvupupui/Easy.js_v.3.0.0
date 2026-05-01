const loggerWinston = require('../core/loggerWinston');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Global error handler middleware
 * Should be last middleware in app
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';
  err.timestamp = new Date().toISOString();

  // Log error
  loggerWinston.error(`[${err.code}] ${err.message}`, {
    statusCode: err.statusCode,
    stack: err.stack,
    method: req.method,
    url: req.url,
    user: req.user?.id,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Handle specific error types
  if (err.statusCode === 400) {
    handleValidationError(res, err);
  } else if (err.statusCode === 401) {
    handleAuthenticationError(res, err);
  } else if (err.statusCode === 403) {
    handleAuthorizationError(res, err);
  } else if (err.statusCode === 404) {
    handleNotFoundError(res, err);
  } else if (err.statusCode === 409) {
    handleConflictError(res, err);
  } else if (err.statusCode >= 500) {
    handleServerError(res, err);
  } else {
    handleGenericError(res, err);
  }

  // Alert on critical errors
  if (err.statusCode >= 500) {
    alertCriticalError(err, req);
  }
};

function handleValidationError(res, err) {
  res.status(400).json({
    success: false,
    error: {
      code: err.code || 'VALIDATION_ERROR',
      message: err.message,
      statusCode: 400,
      details: err.details || null,
      timestamp: err.timestamp
    }
  });
}

function handleAuthenticationError(res, err) {
  res.status(401).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: err.message || 'Authentication required',
      statusCode: 401,
      timestamp: err.timestamp
    }
  });
}

function handleAuthorizationError(res, err) {
  res.status(403).json({
    success: false,
    error: {
      code: 'AUTHORIZATION_ERROR',
      message: err.message || 'Insufficient permissions',
      statusCode: 403,
      timestamp: err.timestamp
    }
  });
}

function handleNotFoundError(res, err) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: err.message || 'Resource not found',
      statusCode: 404,
      timestamp: err.timestamp
    }
  });
}

function handleConflictError(res, err) {
  res.status(409).json({
    success: false,
    error: {
      code: 'CONFLICT',
      message: err.message || 'Resource conflict',
      statusCode: 409,
      timestamp: err.timestamp
    }
  });
}

function handleServerError(res, err) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: isDevelopment 
        ? err.message 
        : 'An unexpected error occurred',
      statusCode: err.statusCode,
      ...(isDevelopment && { stack: err.stack }),
      timestamp: err.timestamp
    }
  });
}

function handleGenericError(res, err) {
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      timestamp: err.timestamp
    }
  });
}

function alertCriticalError(err, req) {
  // Send alert (email, Slack, PagerDuty, etc.)
  // Implementation depends on your monitoring setup
  loggerWinston.fatal(`CRITICAL ERROR: ${err.message}`, {
    code: err.code,
    statusCode: err.statusCode,
    url: req.url,
    stack: err.stack
  });
}

/**
 * Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(err);
};

/**
 * Catch-all error handler for unhandled promises
 */
process.on('unhandledRejection', (reason, promise) => {
  loggerWinston.fatal('Unhandled Rejection', {
    reason: reason.toString(),
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  loggerWinston.fatal('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler
};
