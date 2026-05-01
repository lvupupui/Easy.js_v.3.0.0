const mongoose = require('mongoose');
const Logger = require('../core/logger');

class MongoDBAdapter {
  constructor() {
    this.connection = null;
    this.models = {};
    this.connected = false;
  }

  async connect(connectionString, models = []) {
    try {
      const options = typeof connectionString === 'object' ? { ...connectionString } : {};
      const uri = typeof connectionString === 'string'
        ? connectionString
        : options.uri || options.url || options.connectionString;
      const timeoutMs = options.serverSelectionTimeoutMS || options.timeoutMs || 5000;

      this.connection = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs
      });
      this.connected = true;
      this.buildModels(models);
      Logger.debug('MongoDB models built successfully');
    } catch (error) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  buildModels(models) {
    for (const model of models) {
      const schema = new mongoose.Schema(model.schema, {
        timestamps: true,
        collection: model.name.toLowerCase()
      });

      this.models[model.name] = mongoose.models[model.name] || mongoose.model(model.name, schema);
    }
  }

  async query(modelName, operation, data = null, options = {}) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model '${modelName}' not found`);
    }

    switch (operation) {
      case 'findMany':
        return model.find(data || {}).limit(Number(options.limit || 100));
      case 'findOne':
        return data && data.id ? model.findById(data.id) : model.findOne(data || {});
      case 'create':
        return model.create(data);
      case 'update':
        return model.findByIdAndUpdate(data.id, { ...data, id: undefined }, { new: true });
      case 'delete':
        return data && data.id ? model.findByIdAndDelete(data.id) : model.deleteMany(data || {});
      case 'count':
        return model.countDocuments(data || {});
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async healthCheck() {
    return { status: this.connected ? 'connected' : 'disconnected' };
  }

  async close() {
    if (this.connection) {
      await mongoose.disconnect();
      this.connected = false;
    }
  }

  async disconnect() {
    return this.close();
  }
}

module.exports = MongoDBAdapter;
