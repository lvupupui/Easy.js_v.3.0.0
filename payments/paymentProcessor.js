const stripe = require('stripe');
const loggerWinston = require('../core/loggerWinston');

class PaymentProcessor {
  constructor(apiKey, webhookSecret = null) {
    this.stripe = new stripe(apiKey);
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        }
      });

      loggerWinston.info('Payment intent created', {
        intentId: intent.id,
        amount: amount,
        currency
      });

      return intent;
    } catch (error) {
      loggerWinston.error('Failed to create payment intent', { error: error.message });
      throw error;
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(intentId, paymentMethod) {
    try {
      const intent = await this.stripe.paymentIntents.confirm(intentId, {
        payment_method: paymentMethod
      });

      if (intent.status === 'succeeded') {
        loggerWinston.info('Payment succeeded', { intentId });
      }

      return intent;
    } catch (error) {
      loggerWinston.error('Payment confirmation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata
      });

      loggerWinston.info('Customer created', { customerId: customer.id, email });
      return customer;
    } catch (error) {
      loggerWinston.error('Failed to create customer', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });

      loggerWinston.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId,
        priceId
      });

      return subscription;
    } catch (error) {
      loggerWinston.error('Failed to create subscription', { error: error.message });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, immediately = false) {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: !immediately }
      );

      if (immediately) {
        await this.stripe.subscriptions.del(subscriptionId);
      }

      loggerWinston.info('Subscription cancelled', { subscriptionId });
      return subscription;
    } catch (error) {
      loggerWinston.error('Failed to cancel subscription', { error: error.message });
      throw error;
    }
  }

  /**
   * Get subscription
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      loggerWinston.error('Failed to retrieve subscription', { error: error.message });
      throw error;
    }
  }

  /**
   * Create an invoice
   */
  async createInvoice(customerId, items = []) {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: false,
        collection_method: 'charge_automatically'
      });

      for (const item of items) {
        await this.stripe.invoiceItems.create({
          invoice: invoice.id,
          customer: customerId,
          amount: Math.round(item.amount * 100),
          currency: item.currency || 'usd',
          description: item.description
        });
      }

      loggerWinston.info('Invoice created', {
        invoiceId: invoice.id,
        customerId
      });

      return invoice;
    } catch (error) {
      loggerWinston.error('Failed to create invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(invoiceId) {
    try {
      const invoice = await this.stripe.invoices.sendInvoice(invoiceId);

      loggerWinston.info('Invoice sent', { invoiceId });
      return invoice;
    } catch (error) {
      loggerWinston.error('Failed to send invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Finalize invoice
   */
  async finalizeInvoice(invoiceId) {
    try {
      const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);

      loggerWinston.info('Invoice finalized', { invoiceId });
      return invoice;
    } catch (error) {
      loggerWinston.error('Failed to finalize invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(chargeId, amount = null) {
    try {
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        ...(amount && { amount: Math.round(amount * 100) })
      });

      loggerWinston.info('Refund created', {
        refundId: refund.id,
        chargeId,
        amount: amount
      });

      return refund;
    } catch (error) {
      loggerWinston.error('Failed to create refund', { error: error.message });
      throw error;
    }
  }

  /**
   * List charges for customer
   */
  async listCharges(customerId, limit = 10) {
    try {
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit
      });

      return charges.data;
    } catch (error) {
      loggerWinston.error('Failed to list charges', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a price
   */
  async createPrice(productId, amount, currency = 'usd', billingScheme = 'per_unit') {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency,
        billing_scheme: billingScheme,
        recurring: {
          interval: 'month',
          usage_type: 'licensed'
        }
      });

      loggerWinston.info('Price created', { priceId: price.id, productId });
      return price;
    } catch (error) {
      loggerWinston.error('Failed to create price', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a product
   */
  async createProduct(name, description = '') {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
        type: 'service'
      });

      loggerWinston.info('Product created', { productId: product.id });
      return product;
    } catch (error) {
      loggerWinston.error('Failed to create product', { error: error.message });
      throw error;
    }
  }

  /**
   * Webhook signature verification
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return event;
    } catch (error) {
      loggerWinston.error('Webhook signature verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle common webhook events
   */
  handleWebhookEvent(event, handlers = {}) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        if (handlers.onPaymentSucceeded) {
          handlers.onPaymentSucceeded(event.data.object);
        }
        break;
      case 'payment_intent.payment_failed':
        if (handlers.onPaymentFailed) {
          handlers.onPaymentFailed(event.data.object);
        }
        break;
      case 'customer.subscription.updated':
        if (handlers.onSubscriptionUpdated) {
          handlers.onSubscriptionUpdated(event.data.object);
        }
        break;
      case 'customer.subscription.deleted':
        if (handlers.onSubscriptionCancelled) {
          handlers.onSubscriptionCancelled(event.data.object);
        }
        break;
      case 'invoice.paid':
        if (handlers.onInvoicePaid) {
          handlers.onInvoicePaid(event.data.object);
        }
        break;
      case 'charge.refunded':
        if (handlers.onRefunded) {
          handlers.onRefunded(event.data.object);
        }
        break;
    }
  }
}

module.exports = PaymentProcessor;
