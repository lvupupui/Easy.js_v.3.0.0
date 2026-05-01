const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const WebhookManager = require('../../core/webhookManager');

describe('WebhookManager', () => {
  it('verifies HMAC signatures with and without sha256 prefix', () => {
    const manager = new WebhookManager();
    const payload = { type: 'payment.succeeded', id: 'evt_1' };
    const signature = crypto
      .createHmac('sha256', 'secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    expect(manager.verifyHmac(payload, signature, 'secret')).toBe(true);
    expect(manager.verifyHmac(payload, `sha256=${signature}`, 'secret')).toBe(true);
    expect(manager.verifyHmac(payload, signature, 'wrong-secret')).toBe(false);
  });

  it('dispatches specific and wildcard handlers in order', async () => {
    const manager = new WebhookManager();
    const calls = [];
    manager
      .on('stripe.created', async payload => {
        calls.push(['specific', payload.id]);
        return 'specific-result';
      })
      .on('*', async payload => {
        calls.push(['wildcard', payload.id]);
        return 'wildcard-result';
      });

    const results = await manager.dispatch('stripe.created', { id: 'evt_1' });

    expect(calls).toEqual([
      ['specific', 'evt_1'],
      ['wildcard', 'evt_1']
    ]);
    expect(results).toEqual(['specific-result', 'wildcard-result']);
  });

  it('serves webhook routes with configured signatures', async () => {
    const manager = new WebhookManager({ stripeSecret: 'secret' });
    const handler = jest.fn();
    manager.on('stripe.created', handler);
    const app = express();
    app.use('/webhooks', manager.router());

    const payload = { id: 'evt_1' };
    const raw = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', 'secret').update(raw).digest('hex');

    await request(app)
      .post('/webhooks/stripe/created')
      .set('x-webhook-signature', signature)
      .send(payload)
      .expect(200, { success: true, received: true });

    expect(handler).toHaveBeenCalledWith(payload, expect.objectContaining({ provider: 'stripe' }));

    await request(app)
      .post('/webhooks/stripe/created')
      .set('x-webhook-signature', 'bad')
      .send(payload)
      .expect(401, { success: false, error: 'Invalid webhook signature' });
  });

  it('serves unsigned routes and reports handler failures', async () => {
    const manager = new WebhookManager();
    manager.on('github.push', () => {
      throw new Error('handler failed');
    });
    const app = express();
    app.use('/webhooks', manager.router());

    await request(app)
      .post('/webhooks/github/push')
      .send({ ref: 'main' })
      .expect(500, { success: false, error: 'handler failed' });

    const okManager = new WebhookManager();
    const okApp = express();
    okApp.use('/webhooks', okManager.router({ secret: 'top-secret' }));
    const payload = { ok: true };
    const raw = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', 'top-secret').update(raw).digest('hex');

    await request(okApp)
      .post('/webhooks/custom/event')
      .set('stripe-signature', signature)
      .send(payload)
      .expect(200, { success: true, received: true });
  });
});
