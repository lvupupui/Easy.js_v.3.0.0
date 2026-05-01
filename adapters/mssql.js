const crypto = require('crypto');
const { assertIdentifier, toSqlType } = require('../core/databaseUtils');

class MSSQLAdapter {
  constructor() {
    this.sql = null;
    this.pool = null;
    this.connected = false;
  }

  async connect(connection, models = []) {
    this.sql = require('mssql');
    const config = typeof connection === 'string' ? this.parseConnection(connection) : connection;
    this.pool = await this.sql.connect(config);
    this.connected = true;
    await this.createTables(models);
  }

  parseConnection(connection) {
    const url = new URL(connection);
    return {
      server: url.hostname,
      port: Number(url.port || 1433),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      options: {
        encrypt: url.searchParams.get('encrypt') !== 'false',
        trustServerCertificate: url.searchParams.get('trustServerCertificate') === 'true'
      }
    };
  }

  async createTables(models = []) {
    for (const model of models) {
      const table = assertIdentifier(model.name, 'table name');
      const columns = Object.entries(model.fields || model.schema || {})
        .map(([key, type]) => `[${assertIdentifier(key, 'column name')}] ${this.mapType(type)}`)
        .join(', ');
      await this.pool.request().query(`
        IF OBJECT_ID(N'${table}', N'U') IS NULL
        CREATE TABLE [${table}] (
          id NVARCHAR(64) PRIMARY KEY,
          ${columns ? `${columns},` : ''}
          created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
        )
      `);
    }
  }

  mapType(type) {
    const mapped = toSqlType(type, 'mssql').toUpperCase();
    if (mapped.includes('INT')) return 'INT';
    if (mapped.includes('BOOL')) return 'BIT';
    if (mapped.includes('JSON')) return 'NVARCHAR(MAX)';
    if (mapped.includes('TEXT')) return 'NVARCHAR(MAX)';
    if (mapped.includes('DATE')) return 'DATETIME2';
    return 'NVARCHAR(255)';
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
        return this.count(model, data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  addWhere(request, query = {}) {
    const entries = Object.entries(query || {});
    if (!entries.length) return '';
    entries.forEach(([key, value], index) => {
      assertIdentifier(key, 'column name');
      request.input(`p${index}`, value);
    });
    return ` WHERE ${entries.map(([key], index) => `[${key}] = @p${index}`).join(' AND ')}`;
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    const request = this.pool.request();
    const where = this.addWhere(request, query);
    const result = await request.query(`SELECT TOP (${Number(options.limit || 100)}) * FROM [${table}]${where}`);
    return result.recordset;
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async create(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const item = { id: data.id || crypto.randomUUID(), ...data };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    const request = this.pool.request();
    keys.forEach(key => request.input(key, item[key]));
    await request.query(`INSERT INTO [${table}] (${keys.map(key => `[${key}]`).join(', ')}) VALUES (${keys.map(key => `@${key}`).join(', ')})`);
    return item;
  }

  async update(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updates } = data;
    const keys = Object.keys(updates).map(key => assertIdentifier(key, 'column name'));
    const request = this.pool.request().input('id', id);
    keys.forEach(key => request.input(key, updates[key]));
    await request.query(`UPDATE [${table}] SET ${keys.map(key => `[${key}] = @${key}`).join(', ')}, updated_at = SYSUTCDATETIME() WHERE id = @id`);
    return { id, ...updates };
  }

  async delete(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const request = this.pool.request();
    const where = this.addWhere(request, query);
    const result = await request.query(`DELETE FROM [${table}]${where}`);
    return { deleted: result.rowsAffected[0] || 0 };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const request = this.pool.request();
    const where = this.addWhere(request, query);
    const result = await request.query(`SELECT COUNT(*) AS count FROM [${table}]${where}`);
    return Number(result.recordset[0].count || 0);
  }

  async healthCheck() {
    await this.pool.request().query('SELECT 1 AS ok');
    return { status: 'connected' };
  }

  async close() {
    if (this.pool) await this.pool.close();
    this.connected = false;
  }
}

module.exports = MSSQLAdapter;
