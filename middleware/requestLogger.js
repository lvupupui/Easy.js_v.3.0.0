const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const loggerWinston = require('../core/loggerWinston');
const isTest = process.env.NODE_ENV === 'test';

// Ensure logs directory
const logsDir = path.join(__dirname, '../logs');
if (!isTest && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom morgan format
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
morgan.token('response-time-ms', (req, res) => {
  if (!res._header) return '';
  const time = res._responseTime;
  return time ? `${time.toFixed(2)}ms` : '0ms';
});

// Create write streams
const noopStream = { write: () => {} };

const accessLogStream = isTest
  ? noopStream
  : fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

const errorLogStream = isTest
  ? noopStream
  : fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Morgan middleware configurations
const morganConfigs = {
  development: morgan(
    ':method :url :status :response-time-ms - :res[content-length] bytes - User: :user-id',
    { stream: process.stdout }
  ),

  production: morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms',
    {
      stream: accessLogStream,
      skip: (req, res) => res.statusCode < 400
    }
  ),

  combined: morgan('combined', { stream: accessLogStream })
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Capture response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    res._responseTime = duration;

    loggerWinston.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return originalJson.call(this, data);
  };

  next();
};

// Error request logger
const errorRequestLogger = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      loggerWinston.warn(`${req.method} ${req.path} - Error ${res.statusCode}`, {
        statusCode: res.statusCode,
        user: req.user?.id,
        ip: req.ip,
        body: req.body
      });
    }
  });

  next();
};

module.exports = {
  morganDevelopment: morganConfigs.development,
  morganProduction: morganConfigs.production,
  morganCombined: morganConfigs.combined,
  requestLogger,
  errorRequestLogger
};
