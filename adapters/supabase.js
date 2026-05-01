const { createClient } = require('@supabase/supabase-js');
const Logger = require('../core/logger');

class SupabaseAdapter {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect(config, models) {
    try {
      this.client = createClient(config.url, config.key);
      this.connected = true;
      Logger.success('Supabase connected');

      // Initialize tables
      for (const model of models) {
        await this.initTable(model);
      }
    } catch (error) {
      Logger.error('Supabase connection error: ' + error.message);
      throw error;
    }
  }

  async initTable(model) {
    Logger.info(`Supabase table ready: ${model.name}`);
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('Supabase not connected');

    try {
      switch (operation) {
        case 'findOne':
          return await this.findOne(model, data);
        case 'findMany':
          return await this.findMany(model, data, options);
        case 'create':
          return await this.create(model, data);
        case 'update':
          return await this.update(model, data);
        case 'delete':
          return await this.delete(model, data);
        case 'count':
          return await this.count(model, data);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      Logger.error(`Query error: ${error.message}`);
      throw error;
    }
  }

  async findOne(model, query) {
    const [key, value] = Object.entries(query)[0];
    const { data, error } = await this.client
      .from(model)
      .select('*')
      .eq(key, value)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }

  async findMany(model, query = {}, options = {}) {
    let q = this.client.from(model).select('*');

    if (Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        q = q.eq(key, value);
      }
    }

    if (options.limit) q = q.limit(options.limit);
    if (options.skip) q = q.range(options.skip, options.skip + (options.limit || 10));

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async create(model, data) {
    const { data: created, error } = await this.client
      .from(model)
      .insert([data])
      .select();

    if (error) throw error;
    return created[0];
  }

  async update(model, data) {
    const { id, ...updateData } = data;
    const { data: updated, error } = await this.client
      .from(model)
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return updated[0];
  }

  async delete(model, query) {
    const [key, value] = Object.entries(query)[0];
    const { error } = await this.client
      .from(model)
      .delete()
      .eq(key, value);

    if (error) throw error;
    return { deleted: true };
  }

  async count(model, query = {}) {
    let q = this.client.from(model).select('*', { count: 'exact', head: true });

    if (Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        q = q.eq(key, value);
      }
    }

    const { count } = await q;
    return count;
  }

  async healthCheck() {
    return { status: this.connected ? 'connected' : 'disconnected' };
  }

  async close() {
    this.connected = false;
  }
}

module.exports = SupabaseAdapter;
