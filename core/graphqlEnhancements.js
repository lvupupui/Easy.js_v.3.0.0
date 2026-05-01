class GraphQLEnhancements {
  constructor() {
    this.directives = new Map();
    this.middleware = [];
    this.cache = new Map();
    this.subscriptions = new Map();
  }

  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  directive(name, handler) {
    this.directives.set(name, handler);
    return this;
  }

  cacheQuery(key, value, ttlMs = 60000) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  getCachedQuery(key) {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  subscription(topic, handler) {
    if (!this.subscriptions.has(topic)) this.subscriptions.set(topic, new Set());
    this.subscriptions.get(topic).add(handler);
    return () => this.subscriptions.get(topic).delete(handler);
  }

  publish(topic, payload) {
    const subscribers = this.subscriptions.get(topic) || [];
    for (const handler of subscribers) handler(payload);
  }
}

module.exports = GraphQLEnhancements;
