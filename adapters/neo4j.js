const crypto = require('crypto');
const { assertIdentifier } = require('../core/databaseUtils');

class Neo4jAdapter {
  constructor() {
    this.driver = null;
    this.connected = false;
  }

  async connect(connection, models = []) {
    const neo4j = require('neo4j-driver');
    const config = typeof connection === 'string' ? this.parseConnection(connection) : connection;
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password)
    );
    await this.driver.verifyConnectivity();
    this.connected = true;
    await this.createConstraints(models);
  }

  parseConnection(connection) {
    const url = new URL(connection);
    return {
      uri: `${url.protocol}//${url.host}`,
      user: decodeURIComponent(url.username || 'neo4j'),
      password: decodeURIComponent(url.password || '')
    };
  }

  async createConstraints(models = []) {
    const session = this.driver.session();
    try {
      for (const model of models) {
        const label = assertIdentifier(model.name, 'label');
        await session.run(`CREATE CONSTRAINT ${label}_id IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`);
      }
    } finally {
      await session.close();
    }
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

  where(query = {}, prefix = 'n') {
    const entries = Object.entries(query || {});
    if (!entries.length) return { clause: '', params: {} };
    const params = {};
    const clause = entries.map(([key, value], index) => {
      assertIdentifier(key, 'property');
      params[`p${index}`] = value;
      return `${prefix}.${key} = $p${index}`;
    }).join(' AND ');
    return { clause: ` WHERE ${clause}`, params };
  }

  row(record) {
    const node = record.get('n');
    return node ? node.properties : null;
  }

  async findMany(model, query = {}, options = {}) {
    const label = assertIdentifier(model, 'label');
    const where = this.where(query);
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (n:${label})${where.clause} RETURN n LIMIT ${Number(options.limit || 100)}`, where.params);
      return result.records.map(record => this.row(record));
    } finally {
      await session.close();
    }
  }

  async findOne(model, query = {}) {
    const rows = await this.findMany(model, query, { limit: 1 });
    return rows[0] || null;
  }

  async create(model, data = {}) {
    const label = assertIdentifier(model, 'label');
    const item = { id: data.id || crypto.randomUUID(), ...data };
    const session = this.driver.session();
    try {
      const result = await session.run(`CREATE (n:${label} $props) RETURN n`, { props: item });
      return this.row(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async update(model, data = {}) {
    const label = assertIdentifier(model, 'label');
    const { id, ...updates } = data;
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (n:${label} {id: $id}) SET n += $props RETURN n`, {
        id,
        props: { ...updates, updated_at: new Date().toISOString() }
      });
      return result.records[0] ? this.row(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  async delete(model, query = {}) {
    const label = assertIdentifier(model, 'label');
    const where = this.where(query);
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (n:${label})${where.clause} DETACH DELETE n`, where.params);
      return { deleted: result.summary.counters.updates().nodesDeleted };
    } finally {
      await session.close();
    }
  }

  async count(model, query = {}) {
    const label = assertIdentifier(model, 'label');
    const where = this.where(query);
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (n:${label})${where.clause} RETURN count(n) AS count`, where.params);
      return Number(result.records[0].get('count').toString());
    } finally {
      await session.close();
    }
  }

  async healthCheck() {
    await this.driver.verifyConnectivity();
    return { status: 'connected' };
  }

  async close() {
    if (this.driver) await this.driver.close();
    this.connected = false;
  }
}

module.exports = Neo4jAdapter;
