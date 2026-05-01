const crypto = require('crypto');
const { assertIdentifier, toSqlType } = require('../core/databaseUtils');

class LibSQLAdapter {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect(connection, models = []) {
    const { createClient } = require('@libsql/client');
    const config = typeof connection === 'string' ? { url: connection } : connection;
    this.client = createClient(config);
    await this.client.execute('SELECT 1');
    this.connected = true;
    await this.createTables(models);
  }

  async createTables(models = []) {
    for (const model of models) {
      const table = assertIdentifier(model.name, 'table name');
      const columns = Object.entries(model.fields || model.schema || {})
        .map(([key, type]) => `"${assertIdentifier(key, 'column name')}" ${this.mapType(type)}`)
        .join(', ');
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          id TEXT PRIMARY KEY,
          ${columns ? `${columns},` : ''}
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  mapType(type) {
    const mapped = toSqlType(type, 'sqlite').toUpperCase();
    if (mapped.includes('INT')) return 'INTEGER';
    if (mapped.includes('REAL')) return 'REAL';
    return 'TEXT';
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

  whereClause(query = {}) {
    const entries = Object.entries(query || {});
    if (!entries.length) return { sql: '', args: [] };
    return {
      sql: ` WHERE ${entries.map(([key]) => `"${assertIdentifier(key, 'column name')}" = ?`).join(' AND ')}`,
      args: entries.map(([, value]) => value)
    };
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const result = await this.client.execute({
      sql: `SELECT * FROM "${table}"${where.sql} LIMIT ${Number(options.limit || 100)}`,
      args: where.args
    });
    return result.rows;
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async create(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const item = { id: data.id || crypto.randomUUID(), ...data };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    await this.client.execute({
      sql: `INSERT INTO "${table}" (${keys.map(key => `"${key}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      args: keys.map(key => item[key])
    });
    return item;
  }

  async update(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updates } = data;
    const keys = Object.keys(updates).map(key => assertIdentifier(key, 'column name'));
    if (!keys.length) return data;
    await this.client.execute({
      sql: `UPDATE "${table}" SET ${keys.map(key => `"${key}" = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...keys.map(key => updates[key]), id]
    });
    return { id, ...updates };
  }

  async delete(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    await this.client.execute({ sql: `DELETE FROM "${table}"${where.sql}`, args: where.args });
    return { deleted: true };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const result = await this.client.execute({ sql: `SELECT COUNT(*) AS count FROM "${table}"${where.sql}`, args: where.args });
    return Number(result.rows[0]?.count || 0);
  }

  async healthCheck() {
    await this.client.execute('SELECT 1');
    return { status: 'connected' };
  }

  async close() {
    if (this.client && this.client.close) this.client.close();
    this.connected = false;
  }
}

module.exports = LibSQLAdapter;
