const cassandra = require('cassandra-driver');
const Logger = require('../core/logger');
const { assertIdentifier } = require('../core/databaseUtils');

class CassandraAdapter {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect(config, models) {
    try {
      const keyspace = assertIdentifier(config.keyspace || 'easyjs', 'keyspace');
      this.client = new cassandra.Client(this.buildClientConfig(config));

      await this.client.connect();
      this.connected = true;
      Logger.success('Cassandra connected');

      // Create keyspace before selecting it so first-time live clusters work.
      await this.setupKeyspace(keyspace);
      await this.client.execute(`USE ${keyspace}`);
      for (const model of models) {
        await this.createTable(model, keyspace);
      }
    } catch (error) {
      Logger.error('Cassandra connection error: ' + error.message);
      throw error;
    }
  }

  async setupKeyspace(keyspace) {
    const safeKeyspace = assertIdentifier(keyspace, 'keyspace');
    const query = `
      CREATE KEYSPACE IF NOT EXISTS ${safeKeyspace}
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `;
    await this.client.execute(query);
  }

  buildClientConfig(config = {}) {
    const clientConfig = {
      contactPoints: config.contactPoints || ['127.0.0.1'],
      localDataCenter: config.localDataCenter || 'datacenter1'
    };

    if (config.username && config.password) {
      clientConfig.authProvider = new cassandra.auth.PlainTextAuthProvider(config.username, config.password);
    }

    if (config.sslOptions) {
      clientConfig.sslOptions = config.sslOptions;
    } else if (config.ssl) {
      clientConfig.sslOptions = {};
    }

    const secureConnectBundle = config.secureConnectBundle || config.cloudSecureConnectBundle;
    if (secureConnectBundle) {
      clientConfig.cloud = { secureConnectBundle };
    } else if (config.cloud) {
      clientConfig.cloud = config.cloud;
    }

    return clientConfig;
  }

  async createTable(model, keyspace) {
    const safeKeyspace = assertIdentifier(keyspace, 'keyspace');
    const table = assertIdentifier(model.name, 'table name');
    const columns = Object.entries(model.fields || model.schema || {})
      .map(([key, type]) => `${assertIdentifier(key, 'column name')} ${this.mapType(type)}`);
    const allColumns = [
      'id uuid PRIMARY KEY',
      ...columns,
      'created_at timestamp',
      'updated_at timestamp'
    ].join(',\n        ');

    const query = `
      CREATE TABLE IF NOT EXISTS ${safeKeyspace}.${table} (
        ${allColumns}
      )
    `;

    await this.client.execute(query);
    Logger.info(`Table created: ${table}`);
  }

  mapType(type) {
    const mappings = {
      string: 'text',
      number: 'int',
      boolean: 'boolean',
      date: 'timestamp',
      uuid: 'uuid',
      json: 'text'
    };
    return mappings[type] || 'text';
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('Cassandra not connected');

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
    const table = assertIdentifier(model, 'table name');
    const [key, value] = Object.entries(query)[0];
    const column = assertIdentifier(key, 'column name');
    const q = `SELECT * FROM ${table} WHERE ${column} = ? LIMIT 1`;
    const result = await this.client.execute(q, [value]);
    return result.rows[0] || null;
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    let q = `SELECT * FROM ${table}`;
    const params = [];

    if (Object.keys(query).length > 0) {
      const [key, value] = Object.entries(query)[0];
      q += ` WHERE ${assertIdentifier(key, 'column name')} = ?`;
      params.push(value);
    }

    if (options.limit) {
      q += ` LIMIT ${options.limit}`;
    }

    const result = await this.client.execute(q, params);
    return result.rows;
  }

  async create(model, data) {
    const table = assertIdentifier(model, 'table name');
    const id = data.id || cassandra.types.uuid().toString();
    const item = { id, ...data };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    const placeholders = keys.map(() => '?').join(', ');
    const q = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    await this.client.execute(q, Object.values(item));
    return item;
  }

  async update(model, data) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updateData } = data;
    const setClause = Object.keys(updateData)
      .map(key => `${assertIdentifier(key, 'column name')} = ?`)
      .join(', ');
    const q = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    await this.client.execute(q, [...Object.values(updateData), id]);
    return { id, ...updateData };
  }

  async delete(model, query) {
    const table = assertIdentifier(model, 'table name');
    const [key, value] = Object.entries(query)[0];
    const column = assertIdentifier(key, 'column name');
    const q = `DELETE FROM ${table} WHERE ${column} = ?`;
    await this.client.execute(q, [value]);
    return { deleted: true };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    let q = `SELECT COUNT(*) AS count FROM ${table}`;
    const params = [];
    if (Object.keys(query).length > 0) {
      const [key, value] = Object.entries(query)[0];
      q += ` WHERE ${assertIdentifier(key, 'column name')} = ?`;
      params.push(value);
    }
    const result = await this.client.execute(q, params);
    return Number(result.rows[0].count || 0);
  }

  async healthCheck() {
    await this.client.execute('SELECT now() FROM system.local');
    return { status: 'connected' };
  }

  async close() {
    if (this.client) await this.client.shutdown();
    this.connected = false;
  }
}

module.exports = CassandraAdapter;
