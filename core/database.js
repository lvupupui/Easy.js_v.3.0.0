const Logger = require('./logger');
const QueryBuilder = require('./queryBuilder');
const { normalizeModels, normalizeQueryInput } = require('./databaseUtils');
const OptionalPackageAdapter = require('../adapters/optionalPackage');

function loadAdapter(modulePath) {
  return () => require(modulePath);
}

const adapters = {
  mongodb: loadAdapter('../adapters/mongodb'),
  mysql: loadAdapter('../adapters/mysql'),
  postgresql: loadAdapter('../adapters/postgresql'),
  firebase: loadAdapter('../adapters/firebase'),
  dynamodb: loadAdapter('../adapters/dynamodb'),
  redis: loadAdapter('../adapters/redis'),
  supabase: loadAdapter('../adapters/supabase'),
  elasticsearch: loadAdapter('../adapters/elasticsearch'),
  cassandra: loadAdapter('../adapters/cassandra'),
  sqlite: loadAdapter('../adapters/sqlite'),
  libsql: loadAdapter('../adapters/libsql'),
  mssql: loadAdapter('../adapters/mssql'),
  neo4j: loadAdapter('../adapters/neo4j')
};

class DatabaseManager {
  constructor() {
    this.adapters = {};
    this.primaryDB = null;
    this.dbConfigs = {};
    this.adapterMap = {
      mongodb: adapters.mongodb,
      mongo: adapters.mongodb,
      mysql: adapters.mysql,
      mariadb: adapters.mysql,
      planetscale: adapters.mysql,
      postgres: adapters.postgresql,
      postgresql: adapters.postgresql,
      pg: adapters.postgresql,
      cockroach: adapters.postgresql,
      cockroachdb: adapters.postgresql,
      neon: adapters.postgresql,
      firebase: adapters.firebase,
      firestore: adapters.firebase,
      dynamodb: adapters.dynamodb,
      redis: adapters.redis,
      redisdb: adapters.redis,
      supabase: adapters.supabase,
      elasticsearch: adapters.elasticsearch,
      elastic: adapters.elasticsearch,
      opensearch: adapters.elasticsearch,
      cassandra: adapters.cassandra,
      sqlite: adapters.sqlite,
      sqlite3: adapters.sqlite,
      libsql: adapters.libsql,
      turso: adapters.libsql,
      mssql: adapters.mssql,
      sqlserver: adapters.mssql,
      neo4j: adapters.neo4j,
      oracle: OptionalPackageAdapter.for('oracle', 'oracledb'),
      oracledb: OptionalPackageAdapter.for('oracledb', 'oracledb'),
      snowflake: OptionalPackageAdapter.for('snowflake', 'snowflake-sdk'),
      bigquery: OptionalPackageAdapter.for('bigquery', '@google-cloud/bigquery')
    };
  }

  async initialize(databases = [], models = []) {
    Logger.info('Initializing databases...');
    Logger.info(`Found ${databases.length} database configuration(s)`);

    const normalizedModels = normalizeModels(models);

    for (const dbConfig of databases) {
      const type = dbConfig.type.toLowerCase();
      const AdapterClass = this.resolveAdapter(type);

      if (!AdapterClass) {
        Logger.error(`Unknown database type: ${type}`);
        throw new Error(`Unsupported database type: ${type}`);
      }

      try {
        const adapter = new AdapterClass();
        await adapter.connect(dbConfig.connection, normalizedModels);

        this.adapters[type] = adapter;
        this.dbConfigs[type] = dbConfig;

        if (!this.primaryDB) {
          this.primaryDB = adapter;
          Logger.success(`Primary database set to: ${type}`);
        }

        Logger.success(`${type.toUpperCase()} connected and ready`);
      } catch (error) {
        Logger.error(`Failed to initialize ${type}: ${error.message}`);
        throw error;
      }
    }

    if (!this.primaryDB) {
      throw new Error('No database was successfully initialized');
    }

    Logger.success(`All databases initialized. Primary: ${this.getPrimaryDBType()}`);
  }

  resolveAdapter(type) {
    const entry = this.adapterMap[type];
    if (!entry) {
      return null;
    }
    if (entry.prototype && typeof entry.prototype.connect === 'function') {
      return entry;
    }
    return entry();
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.primaryDB) {
      throw new Error('No database configured. Please initialize databases first.');
    }

    const normalized = normalizeQueryInput(operation, data, options);
    return this.primaryDB.query(model, normalized.operation, normalized.data, normalized.options);
  }

  async queryDatabase(dbType, model, operation, data = null, options = {}) {
    const adapter = this.adapters[dbType.toLowerCase()];
    if (!adapter) {
      throw new Error(`Database ${dbType} not connected`);
    }
    const normalized = normalizeQueryInput(operation, data, options);
    return adapter.query(model, normalized.operation, normalized.data, normalized.options);
  }

  model(modelName) {
    return QueryBuilder.for(modelName);
  }

  getAdapter(type) {
    return this.adapters[type.toLowerCase()] || this.primaryDB;
  }

  getPrimaryDBType() {
    for (const [type, adapter] of Object.entries(this.adapters)) {
      if (adapter === this.primaryDB) return type;
    }
    return 'unknown';
  }

  getConnectedDatabases() {
    return Object.keys(this.adapters);
  }

  async switchPrimaryDB(type) {
    const adapter = this.adapters[type.toLowerCase()];
    if (!adapter) {
      throw new Error(`Database ${type} not connected`);
    }
    this.primaryDB = adapter;
    Logger.success(`Switched primary database to: ${type}`);
  }

  async transaction(dbType, callback) {
    const adapter = this.adapters[dbType.toLowerCase()] || this.primaryDB;
    if (adapter.transaction) {
      return adapter.transaction(callback);
    }
    Logger.warn(`Database ${dbType} does not support transactions`);
    return callback();
  }

  async closeAll() {
    for (const [type, adapter] of Object.entries(this.adapters)) {
      if (adapter.close) {
        await adapter.close();
        Logger.info(`Closed ${type} connection`);
      } else if (adapter.disconnect) {
        await adapter.disconnect();
        Logger.info(`Disconnected ${type} connection`);
      }
    }
  }

  async replicateToAll(model, operation, data = null, options = {}) {
    const results = {};
    const normalized = normalizeQueryInput(operation, data, options);

    for (const [type, adapter] of Object.entries(this.adapters)) {
      try {
        results[type] = await adapter.query(model, normalized.operation, normalized.data, normalized.options);
      } catch (error) {
        Logger.error(`Replication failed on ${type}: ${error.message}`);
        results[type] = { error: error.message };
      }
    }

    return results;
  }

  async healthCheck() {
    const health = {};

    for (const [type, adapter] of Object.entries(this.adapters)) {
      try {
        if (adapter.healthCheck) {
          health[type] = await adapter.healthCheck();
        } else {
          health[type] = { status: 'connected' };
        }
      } catch (error) {
        health[type] = { status: 'error', error: error.message };
      }
    }

    return health;
  }
}

module.exports = DatabaseManager;
