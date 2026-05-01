const { Pool } = require('pg');
const crypto = require('crypto');
const Logger = require('../core/logger');
const { assertIdentifier, toSqlType } = require('../core/databaseUtils');

class PostgreSQLAdapter {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  async connect(connection, models = []) {
    try {
      this.pool = new Pool(typeof connection === 'string' ? {
        connectionString: connection,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      } : connection);

      await this.pool.query('SELECT 1');
      this.connected = true;
      Logger.success('PostgreSQL-compatible database connected');
      await this.createTables(models);
    } catch (error) {
      Logger.error('PostgreSQL connection error: ' + error.message);
      throw error;
    }
  }

  async createTables(models) {
    for (const model of models) {
      const table = assertIdentifier(model.name, 'table name');
      const columns = Object.entries(model.fields || model.schema || {})
        .map(([key, type]) => `"${assertIdentifier(key, 'column name')}" ${toSqlType(type, 'postgres')}`)
        .join(', ');

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          id VARCHAR(64) PRIMARY KEY,
          ${columns ? `${columns},` : ''}
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      Logger.info(`Table ready: ${table}`);
    }
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('PostgreSQL not connected');

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

  buildWhere(query = {}, start = 1) {
    const params = [];
    const entries = Object.entries(query || {});
    if (!entries.length) return { sql: '', params };
    const clauses = entries.map(([key, value], index) => {
      params.push(value);
      return `"${assertIdentifier(key, 'column name')}" = $${start + index}`;
    });
    return { sql: ` WHERE ${clauses.join(' AND ')}`, params };
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async findMany(model, query = {}, options = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.buildWhere(query);
    let sql = `SELECT * FROM "${table}"${where.sql}`;
    if (options.sort) sql += ` ORDER BY "${assertIdentifier(options.sort, 'sort field')}"`;
    if (options.limit) sql += ` LIMIT ${Number(options.limit)}`;
    if (options.skip) sql += ` OFFSET ${Number(options.skip)}`;
    const result = await this.pool.query(sql, where.params);
    return result.rows;
  }

  async create(model, data) {
    const table = assertIdentifier(model, 'table name');
    const item = { id: data?.id || crypto.randomUUID(), ...(data || {}) };
    const keys = Object.keys(item).map(key => assertIdentifier(key, 'column name'));
    if (!keys.length) {
      const result = await this.pool.query(`INSERT INTO "${table}" DEFAULT VALUES RETURNING *`);
      return result.rows[0];
    }
    const values = keys.map(key => item[key]);
    const sql = `
      INSERT INTO "${table}" (${keys.map(key => `"${key}"`).join(', ')})
      VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
      RETURNING *
    `;
    const result = await this.pool.query(sql, values);
    return result.rows[0];
  }

  async update(model, data) {
    const table = assertIdentifier(model, 'table name');
    const { id, ...updateData } = data;
    const keys = Object.keys(updateData).map(key => assertIdentifier(key, 'column name'));
    if (!keys.length) return data;
    const values = keys.map(key => updateData[key]);
    const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const result = await this.pool.query(
      `UPDATE "${table}" SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async delete(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.buildWhere(query);
    const result = await this.pool.query(`DELETE FROM "${table}"${where.sql} RETURNING *`, where.params);
    return { deleted: result.rowCount, rows: result.rows };
  }

  async count(model, query = {}) {
    const table = assertIdentifier(model, 'table name');
    const where = this.buildWhere(query);
    const result = await this.pool.query(`SELECT COUNT(*) FROM "${table}"${where.sql}`, where.params);
    return Number(result.rows[0].count || 0);
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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

module.exports = PostgreSQLAdapter;
