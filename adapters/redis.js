const crypto = require('crypto');

class RedisAdapter {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect(connection = 'redis://localhost:6379') {
    const redis = require('redis');
    const url = typeof connection === 'string' ? connection : connection.url;
    this.client = redis.createClient({ url });
    this.client.on('error', () => {});
    await this.client.connect();
    this.connected = true;
  }

  async query(model, operation, data = null, options = {}) {
    switch (operation) {
      case 'findOne':
        return this.findOne(model, data);
      case 'findMany':
        return this.findMany(model, data, options);
      case 'create':
        return this.create(model, data);
      case 'update':
        return this.update(model, data);
      case 'delete':
        return this.delete(model, data);
      case 'count':
        return this.count(model);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  key(model, id) {
    return `${model}:${id}`;
  }

  indexKey(model) {
    return `${model}:ids`;
  }

  async findOne(model, query = {}) {
    const id = query.id;
    if (!id) return null;
    const value = await this.client.get(this.key(model, id));
    return value ? JSON.parse(value) : null;
  }

  async findMany(model, query = {}, options = {}) {
    const ids = await this.client.sMembers(this.indexKey(model));
    const items = [];
    for (const id of ids.slice(0, Number(options.limit || 100))) {
      const item = await this.findOne(model, { id });
      if (item && this.matches(item, query)) items.push(item);
    }
    return items;
  }

  matches(item, query = {}) {
    return Object.entries(query || {}).every(([key, value]) => item[key] === value);
  }

  async create(model, data = {}) {
    const item = { id: data.id || crypto.randomUUID(), ...data };
    await this.client.set(this.key(model, item.id), JSON.stringify(item));
    await this.client.sAdd(this.indexKey(model), item.id);
    return item;
  }

  async update(model, data = {}) {
    const existing = await this.findOne(model, { id: data.id });
    const item = { ...(existing || {}), ...data, updated_at: new Date().toISOString() };
    await this.client.set(this.key(model, item.id), JSON.stringify(item));
    await this.client.sAdd(this.indexKey(model), item.id);
    return item;
  }

  async delete(model, query = {}) {
    const items = await this.findMany(model, query, { limit: 100000 });
    for (const item of items) {
      await this.client.del(this.key(model, item.id));
      await this.client.sRem(this.indexKey(model), item.id);
    }
    return { deleted: items.length };
  }

  async count(model) {
    return this.client.sCard(this.indexKey(model));
  }

  async healthCheck() {
    await this.client.ping();
    return { status: 'connected' };
  }

  async close() {
    if (this.client) await this.client.quit();
    this.connected = false;
  }
}

module.exports = RedisAdapter;
