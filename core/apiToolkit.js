const crypto = require('crypto');
const express = require('express');
const { AppError } = require('../middleware/errorHandler');

class ApiToolkit {
  constructor(config = {}) {
    this.config = {
      defaultLimit: 20,
      maxLimit: 100,
      apiPrefix: '/api',
      ...config
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.versions = new Map();
  }

  useRequest(interceptor) {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  useResponse(interceptor) {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  interceptorMiddleware() {
    return async (req, res, next) => {
      try {
        for (const interceptor of this.requestInterceptors) {
          await interceptor(req, res);
        }

        const originalJson = res.json.bind(res);
        res.json = async (body) => {
          let nextBody = body;
          for (const interceptor of this.responseInterceptors) {
            nextBody = await interceptor(req, res, nextBody);
          }
          return originalJson(nextBody);
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  registerVersion(version, router) {
    this.versions.set(version, router);
    return this;
  }

  versionedRouter() {
    const router = express.Router();
    for (const [version, versionRouter] of this.versions.entries()) {
      router.use(`/${version}`, versionRouter);
    }
    return router;
  }

  pagination(query = {}) {
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || this.config.defaultLimit, 1),
      this.config.maxLimit
    );
    const offset = Math.max(parseInt(query.offset || query.skip, 10) || 0, 0);
    const cursor = query.cursor || null;

    return { limit, offset, skip: offset, cursor };
  }

  buildFilter(query = {}, allowedFields = []) {
    const filter = {};
    for (const field of allowedFields) {
      if (query[field] !== undefined && query[field] !== '') {
        filter[field] = query[field];
      }
    }
    return filter;
  }

  buildSort(sort = '') {
    if (!sort) return {};
    return String(sort).split(',').reduce((acc, field) => {
      const trimmed = field.trim();
      if (!trimmed) return acc;
      if (trimmed.startsWith('-')) {
        acc[trimmed.slice(1)] = 'desc';
      } else {
        acc[trimmed] = 'asc';
      }
      return acc;
    }, {});
  }

  normalize(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  validate(schema) {
    return async (req, res, next) => {
      try {
        if (!schema) return next();
        const payload = {
          body: req.body,
          query: req.query,
          params: req.params
        };
        const result = schema.validate ? schema.validate(payload, { abortEarly: false }) : null;
        if (result && result.error) {
          throw new AppError(result.error.message, 400, 'VALIDATION_ERROR');
        }
        if (result && result.value) {
          req.validated = result.value;
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  cacheHeaders(options = {}) {
    return (req, res, next) => {
      const maxAge = options.maxAge || 0;
      const privacy = options.private ? 'private' : 'public';
      res.set('Cache-Control', maxAge > 0 ? `${privacy}, max-age=${maxAge}` : 'no-store');
      if (options.etag) {
        const hash = crypto.createHash('sha1').update(req.originalUrl).digest('hex');
        res.set('ETag', `"${hash}"`);
      }
      next();
    };
  }

  exportCSV(rows = [], columns = null) {
    const selectedColumns = columns || Object.keys(rows[0] || {});
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [
      selectedColumns.map(escape).join(','),
      ...rows.map(row => selectedColumns.map(column => escape(row[column])).join(','))
    ].join('\n');
  }

  postmanCollection({ name = 'easy.js API', routes = [], baseUrl = '{{baseUrl}}' } = {}) {
    return {
      info: {
        name,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [{ key: 'baseUrl', value: baseUrl }],
      item: routes.map(route => ({
        name: route.name || `${route.method || 'GET'} ${route.path}`,
        request: {
          method: (route.method || 'GET').toUpperCase(),
          url: `{{baseUrl}}${route.path}`,
          header: route.headers || []
        }
      }))
    };
  }
}

module.exports = ApiToolkit;
