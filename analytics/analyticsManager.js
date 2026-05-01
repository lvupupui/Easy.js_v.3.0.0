class AnalyticsManager {
  constructor(config = {}) {
    this.config = config;
    this.events = [];
    this.flags = new Map(Object.entries(config.flags || {}));
    this.experiments = new Map();
  }

  track(userId, event, properties = {}) {
    const payload = {
      userId,
      event,
      properties,
      timestamp: new Date().toISOString()
    };
    this.events.push(payload);
    return payload;
  }

  identify(userId, traits = {}) {
    return this.track(userId, 'identify', traits);
  }

  page(userId, path, properties = {}) {
    return this.track(userId, 'page_view', { path, ...properties });
  }

  defineFlag(name, enabled = false) {
    this.flags.set(name, enabled);
    return this;
  }

  isEnabled(name, context = {}) {
    const value = this.flags.get(name);
    return typeof value === 'function' ? value(context) : Boolean(value);
  }

  createExperiment(name, variants = ['control', 'variant']) {
    this.experiments.set(name, variants);
    return this;
  }

  getVariant(name, userId) {
    const variants = this.experiments.get(name) || ['control'];
    const hash = Array.from(String(userId)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return variants[hash % variants.length];
  }

  report() {
    return {
      totalEvents: this.events.length,
      byEvent: this.events.reduce((acc, item) => {
        acc[item.event] = (acc[item.event] || 0) + 1;
        return acc;
      }, {}),
      flags: Object.fromEntries(this.flags),
      experiments: Object.fromEntries(this.experiments)
    };
  }
}

module.exports = AnalyticsManager;
