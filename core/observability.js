const loggerWinston = require('./loggerWinston');

class Observability {
  constructor(config = {}) {
    this.config = config;
    this.sentry = null;
    this.tracer = null;
    this.metrics = {
      requests: 0,
      errors: 0,
      durations: []
    };
  }

  initialize() {
    if (this.config.sentryDsn || process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.init({ dsn: this.config.sentryDsn || process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
        this.sentry = Sentry;
      } catch (error) {
        loggerWinston.warn('Sentry package not installed; using logger fallback', { error: error.message });
      }
    }

    try {
      const api = require('@opentelemetry/api');
      this.tracer = api.trace.getTracer(this.config.serviceName || 'easyjs');
    } catch {
      this.tracer = null;
    }

    return this;
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.requests++;
        this.metrics.durations.push(duration);
        if (res.statusCode >= 500) this.metrics.errors++;
      });
      next();
    };
  }

  captureError(error, context = {}) {
    if (this.sentry) {
      this.sentry.captureException(error, { extra: context });
    }
    loggerWinston.error(error.message, { stack: error.stack, ...context });
  }

  trace(name, fn) {
    if (!this.tracer) return fn();
    return this.tracer.startActiveSpan(name, async span => {
      try {
        const result = await fn(span);
        span.end();
        return result;
      } catch (error) {
        span.recordException(error);
        span.end();
        throw error;
      }
    });
  }

  prometheus() {
    const durations = this.metrics.durations;
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return [
      '# HELP easyjs_http_requests_total Total HTTP requests',
      '# TYPE easyjs_http_requests_total counter',
      `easyjs_http_requests_total ${this.metrics.requests}`,
      '# HELP easyjs_http_errors_total Total HTTP 5xx responses',
      '# TYPE easyjs_http_errors_total counter',
      `easyjs_http_errors_total ${this.metrics.errors}`,
      '# HELP easyjs_http_request_duration_avg_ms Average request duration in milliseconds',
      '# TYPE easyjs_http_request_duration_avg_ms gauge',
      `easyjs_http_request_duration_avg_ms ${avg.toFixed(2)}`
    ].join('\n');
  }
}

module.exports = Observability;
