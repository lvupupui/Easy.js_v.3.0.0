const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertIdentifier, toSqlType } = require('../core/databaseUtils');

class SQLiteAdapter {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.filepath = null;
    this.connected = false;
  }

  async connect(connection = ':memory:', models = []) {
    const initSqlJs = require('sql.js');
    this.SQL = await initSqlJs();
    this.filepath = this.resolvePath(connection);

    if (this.filepath !== ':memory:' && fs.existsSync(this.filepath)) {
      this.db = new this.SQL.Database(fs.readFileSync(this.filepath));
    } else {
      this.db = new this.SQL.Database();
    }

    this.connected = true;
    await this.createTables(models);
    this.persist();
  }

  resolvePath(connection) {
    if (!connection || connection === ':memory:' || connection === 'memory') return ':memory:';
    if (typeof connection === 'object') return connection.filename || ':memory:';
    if (connection.startsWith('sqlite://')) return connection.replace(/^sqlite:\/\//, '');
    return connection;
  }

  async createTables(models = []) {
    for (const model of models) {
      const table = assertIdentifier(model.name, 'table name');
      const columns = Object.entries(model.fields || model.schema || {})
        .map(([key, type]) => `"${assertIdentifier(key, 'column name')}" ${this.mapType(type)}`)
        .join(', ');
      this.db.run(`
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
    if (mapped.includes('BOOL')) return 'INTEGER';
    if (mapped.includes('JSON')) return 'TEXT';
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
    if (!entries.length) return { sql: '', values: [] };
    return {
      sql: ` WHERE ${entries.map(([key]) => `"${assertIdentifier(key, 'column name')}" = ?`).join(' AND ')}`,
      values: entries.map(([, value]) => value)
    };
  }

  rows(sql, values = []) {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(values);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const limit = Number(options.limit || 100);
    return this.rows(`SELECT * FROM "${table}"${where.sql} LIMIT ${limit}`, where.values);
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async create(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const item = { id: data.id || crypto.randomUUID(), ...data };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    this.db.run(
      `INSERT INTO "${table}" (${keys.map(key => `"${key}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map(key => item[key])
    );
    this.persist();
    return item;
  }

  async update(model, data = {}) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updates } = data;
    const keys = Object.keys(updates).map(key => assertIdentifier(key, 'column name'));
    if (!keys.length) return data;
    this.db.run(
      `UPDATE "${table}" SET ${keys.map(key => `"${key}" = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...keys.map(key => updates[key]), id]
    );
    this.persist();
    return { id, ...updates };
  }

  async delete(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    this.db.run(`DELETE FROM "${table}"${where.sql}`, where.values);
    this.persist();
    return { deleted: true };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const rows = this.rows(`SELECT COUNT(*) AS count FROM "${table}"${where.sql}`, where.values);
    return Number(rows[0]?.count || 0);
  }

  persist() {
    if (!this.filepath || this.filepath === ':memory:') return;
    fs.mkdirSync(path.dirname(path.resolve(this.filepath)), { recursive: true });
    fs.writeFileSync(this.filepath, Buffer.from(this.db.export()));
  }

  async healthCheck() {
    this.rows('SELECT 1 AS ok');
    return { status: 'connected' };
  }

  async close() {
    this.persist();
    if (this.db) this.db.close();
    this.connected = false;
  }
}

module.exports = SQLiteAdapter;
