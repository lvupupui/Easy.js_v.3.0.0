const { Client } = require('@elastic/elasticsearch');
const Logger = require('../core/logger');

class ElasticsearchAdapter {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect(config, models) {
    try {
      this.client = new Client({
        node: config.node || 'http://localhost:9200',
        auth: config.auth
      });

      await this.client.ping();
      this.connected = true;
      Logger.success('Elasticsearch connected');

      // Create indices
      for (const model of models) {
        await this.createIndex(model.name);
      }
    } catch (error) {
      Logger.error('Elasticsearch connection error: ' + error.message);
      throw error;
    }
  }

  async createIndex(name) {
    try {
      await this.client.indices.create({ index: name });
      Logger.info(`Index created: ${name}`);
    } catch (error) {
      if (error.statusCode === 400) {
        Logger.info(`Index exists: ${name}`);
      } else {
        throw error;
      }
    }
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('Elasticsearch not connected');

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
        case 'search':
          return await this.search(model, data, options);
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
    const response = await this.client.search({
      index: model,
      body: { query: { match: query } },
      size: 1
    });
    return response.hits.hits[0]?._source || null;
  }

  async findMany(model, query = {}, options = {}) {
    const response = await this.client.search({
      index: model,
      body: { query: Object.keys(query).length ? { match: query } : { match_all: {} } },
      size: options.limit || 10,
      from: options.skip || 0
    });
    return response.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
  }

  async create(model, data) {
    const response = await this.client.index({
      index: model,
      body: { ...data, created_at: new Date() }
    });
    return { id: response._id, ...data };
  }

  async update(model, data) {
    const { id, ...updateData } = data;
    await this.client.update({
      index: model,
      id,
      body: { doc: { ...updateData, updated_at: new Date() } }
    });
    return { id, ...updateData };
  }

  async delete(model, query) {
    const response = await this.client.deleteByQuery({
      index: model,
      body: { query: { match: query } }
    });
    return { deleted: response.deleted };
  }

  async search(model, searchTerm, options = {}) {
    const response = await this.client.search({
      index: model,
      body: {
        query: {
          multi_match: {
            query: searchTerm,
            fields: options.fields || ['*']
          }
        }
      },
      size: options.limit || 10,
      from: options.skip || 0
    });
    return response.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
  }

  async count(model, query = {}) {
    const response = await this.client.count({
      index: model,
      body: { query: Object.keys(query || {}).length ? { match: query } : { match_all: {} } }
    });
    return response.count || 0;
  }

  async healthCheck() {
    await this.client.ping();
    return { status: 'connected' };
  }

  async close() {
    if (this.client) await this.client.close();
    this.connected = false;
  }
}

module.exports = ElasticsearchAdapter;
