const crypto = require('crypto');
const express = require('express');
const loggerWinston = require('./loggerWinston');

class WebhookManager {
  constructor(config = {}) {
    this.config = config;
    this.handlers = new Map();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
    return this;
  }

  verifyHmac(payload, signature, secret, algorithm = 'sha256') {
    const expected = crypto
      .createHmac(algorithm, secret)
      .update(Buffer.isBuffer(payload) ? payload : JSON.stringify(payload))
      .digest('hex');
    const normalized = String(signature || '').replace(/^sha256=/, '');
    if (expected.length !== normalized.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
  }

  async dispatch(event, payload, context = {}) {
    const handlers = this.handlers.get(event) || [];
    const wildcard = this.handlers.get('*') || [];
    const results = [];
    for (const handler of [...handlers, ...wildcard]) {
      results.push(await handler(payload, context));
    }
    return results;
  }

  router(options = {}) {
    const router = express.Router();
    router.post('/:provider/:event', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), async (req, res) => {
      try {
        const secret = options.secret || this.config[`${req.params.provider}Secret`];
        if (secret) {
          const signature = req.headers['x-webhook-signature'] || req.headers['stripe-signature'];
          if (!signature || !this.verifyHmac(req.rawBody || req.body, signature, secret)) {
            return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
          }
        }

        const eventName = `${req.params.provider}.${req.params.event}`;
        await this.dispatch(eventName, req.body, { provider: req.params.provider, req });
        res.json({ success: true, received: true });
      } catch (error) {
        loggerWinston.error('Webhook dispatch failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });
    return router;
  }
}

module.exports = WebhookManager;
