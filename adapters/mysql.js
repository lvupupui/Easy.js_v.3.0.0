const mysql = require('mysql2/promise');
const crypto = require('crypto');
const Logger = require('../core/logger');
const { assertIdentifier, toSqlType } = require('../core/databaseUtils');

class MySQLAdapter {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  async connect(connection, models = []) {
    try {
      this.pool = await mysql.createPool(this.parseConnection(connection));
      await this.pool.query('SELECT 1');
      this.connected = true;
      await this.createTables(models);
      Logger.debug('MySQL/MariaDB tables created/verified');
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  parseConnection(connection) {
    if (connection && typeof connection === 'object') return connection;
    try {
      const url = new URL(connection);
      return {
        host: url.hostname,
        user: decodeURIComponent(url.username || 'root'),
        password: decodeURIComponent(url.password || ''),
        database: url.pathname.replace(/^\//, '') || 'easy_db',
        port: Number(url.port || 3306),
        waitForConnections: true,
        connectionLimit: 20,
        ssl: url.searchParams.get('ssl') === 'true' ? {} : undefined
      };
    } catch {
      return {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'easy_db',
        port: 3306,
        waitForConnections: true,
        connectionLimit: 20
      };
    }
  }

  async createTables(models) {
    for (const model of models) {
      const table = assertIdentifier(model.name, 'table name');
      const columns = Object.entries(model.fields || {})
        .map(([key, type]) => `\`${assertIdentifier(key, 'column name')}\` ${toSqlType(type, 'mysql')}`)
        .join(', ');

      const sql = `
        CREATE TABLE IF NOT EXISTS \`${table}\` (
          id VARCHAR(36) PRIMARY KEY,
          ${columns ? `${columns},` : ''}
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      await this.pool.execute(sql);
    }
  }

  async query(modelName, operation, data = null, options = {}) {
    switch (operation) {
      case 'findMany':
        return this.findMany(modelName, data, options);
      case 'findOne':
        return this.findOne(modelName, data);
      case 'create':
        return this.create(modelName, data);
      case 'update':
        return this.update(modelName, data);
      case 'delete':
        return this.delete(modelName, data);
      case 'count':
        return this.count(modelName, data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  whereClause(query = {}) {
    const entries = Object.entries(query || {});
    if (!entries.length) return { sql: '', values: [] };
    return {
      sql: ` WHERE ${entries.map(([key]) => `\`${assertIdentifier(key, 'column name')}\` = ?`).join(' AND ')}`,
      values: entries.map(([, value]) => value)
    };
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const limit = Number(options.limit || 100);
    const [rows] = await this.pool.execute(`SELECT * FROM \`${table}\`${where.sql} LIMIT ${limit}`, where.values);
    return rows;
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async create(model, data) {
    const table = assertIdentifier(model, 'table name');
    const item = { id: data.id || crypto.randomUUID(), ...data };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => item[key]);
    await this.pool.execute(
      `INSERT INTO \`${table}\` (${keys.map(key => `\`${key}\``).join(', ')}) VALUES (${placeholders})`,
      values
    );
    return item;
  }

  async update(model, data) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updates } = data;
    const keys = Object.keys(updates).map(key => assertIdentifier(key, 'column name'));
    if (!keys.length) return data;
    const values = keys.map(key => updates[key]);
    await this.pool.execute(
      `UPDATE \`${table}\` SET ${keys.map(key => `\`${key}\` = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return { id, ...updates };
  }

  async delete(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const [result] = await this.pool.execute(`DELETE FROM \`${table}\`${where.sql}`, where.values);
    return { deleted: result.affectedRows || 0 };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.whereClause(query);
    const [rows] = await this.pool.execute(`SELECT COUNT(*) AS count FROM \`${table}\`${where.sql}`, where.values);
    return Number(rows[0].count || 0);
  }

  async transaction(callback) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async healthCheck() {
    await this.pool.query('SELECT 1');
    return { status: 'connected' };
  }

  async close() {
    if (this.pool) await this.pool.end();
    this.connected = false;
  }
}

module.exports = MySQLAdapter;
