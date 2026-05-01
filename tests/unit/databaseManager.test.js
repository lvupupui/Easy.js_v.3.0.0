const DatabaseManager = require('../../core/database');
const {
  normalizeFieldType,
  normalizeOperation,
  normalizeQueryInput,
  normalizeModels,
  normalizeModel,
  quoteIdentifier,
  assertIdentifier,
  toSqlType
} = require('../../core/databaseUtils');

describe('database framework contract', () => {
  it('normalizes compiler models into schema and fields forms', () => {
    const [model] = normalizeModels([{ name: 'users', schema: { email: 'email' } }]);
    expect(model.schema.email).toBe('email');
    expect(model.fields.email).toBe('email');
    expect(normalizeModel(null)).toBeNull();
    expect(normalizeModels([{ name: 'posts', fields: { title: { type: { name: 'String' } } } }])[0].fields.title).toBe('string');
    expect(normalizeFieldType({ type: 'Email' })).toBe('email');
    expect(normalizeFieldType({})).toBe('string');
  });

  it('normalizes generated route operations to adapter operations', () => {
    expect(normalizeOperation('find-all')).toBe('findMany');
    expect(normalizeOperation('remove')).toBe('delete');
    expect(normalizeOperation('custom')).toBe('custom');
    expect(normalizeQueryInput('findAll', null, { filter: { role: 'admin' } })).toEqual({
      operation: 'findMany',
      data: { role: 'admin' },
      options: { filter: { role: 'admin' } }
    });
    expect(normalizeQueryInput('list', { role: 'user' })).toEqual({
      operation: 'findMany',
      data: { role: 'user' },
      options: {}
    });
    expect(normalizeQueryInput('findById', '123').data).toEqual({ id: '123' });
    expect(normalizeQueryInput('findOne', { email: 'a@example.com' }).data).toEqual({ email: 'a@example.com' });
    expect(normalizeQueryInput('updateById', { id: '123', updates: { name: 'A' } }).data).toEqual({
      id: '123',
      name: 'A'
    });
    expect(normalizeQueryInput('update', { id: '123', name: 'B' }).data).toEqual({ id: '123', name: 'B' });
    expect(normalizeQueryInput('deleteById', '123').data).toEqual({ id: '123' });
    expect(normalizeQueryInput('delete', { email: 'a@example.com' }).data).toEqual({ email: 'a@example.com' });
    expect(normalizeQueryInput('search', 'term').operation).toBe('search');
  });

  it('rejects unsafe database identifiers', () => {
    expect(() => assertIdentifier('users')).not.toThrow();
    expect(() => assertIdentifier('users;DROP')).toThrow('Invalid identifier');
    expect(quoteIdentifier('users', '`')).toBe('`users`');
    expect(toSqlType('float', 'postgres')).toBe('DOUBLE PRECISION');
    expect(toSqlType('float', 'mysql')).toBe('REAL');
    expect(toSqlType('date', 'postgres')).toBe('TIMESTAMP');
    expect(toSqlType('uuid', 'mysql')).toBe('VARCHAR(36)');
    expect(toSqlType('array', 'postgres')).toBe('JSONB');
    expect(toSqlType('unknown')).toBe('VARCHAR(255)');
  });

  it('registers local, cloud, sql, nosql, graph, and optional database adapters', () => {
    const manager = new DatabaseManager();
    expect(manager.adapterMap.sqlite).toBeDefined();
    expect(manager.adapterMap.libsql).toBeDefined();
    expect(manager.adapterMap.turso).toBeDefined();
    expect(manager.adapterMap.mssql).toBeDefined();
    expect(manager.adapterMap.neo4j).toBeDefined();
    expect(manager.adapterMap.redis).toBeDefined();
    expect(manager.adapterMap.cockroachdb).toBe(manager.adapterMap.postgresql);
    expect(manager.adapterMap.mariadb).toBe(manager.adapterMap.mysql);
    expect(manager.adapterMap.oracle).toBeDefined();
  });

  it('routes manager queries through normalized adapter operations', async () => {
    const manager = new DatabaseManager();
    manager.primaryDB = {
      query: jest.fn().mockResolvedValue({ ok: true })
    };

    await manager.query('users', 'findById', 'u1');

    expect(manager.primaryDB.query).toHaveBeenCalledWith('users', 'findOne', { id: 'u1' }, {});
  });

  it('initializes adapters, switches primaries, replicates, checks health, and closes', async () => {
    const calls = [];
    class FakeAdapter {
      async connect(connection, models) {
        this.connection = connection;
        this.models = models;
        calls.push(['connect', connection, models[0].name]);
      }

      async query(model, operation, data, options) {
        if (this.connection === 'replica' && operation === 'create') {
          throw new Error('replica unavailable');
        }
        return { connection: this.connection, model, operation, data, options };
      }

      async transaction(callback) {
        return callback('trx');
      }

      async healthCheck() {
        return { status: 'connected', connection: this.connection };
      }

      async close() {
        calls.push(['close', this.connection]);
      }
    }

    const manager = new DatabaseManager();
    manager.adapterMap.fake = FakeAdapter;
    manager.adapterMap.replica = FakeAdapter;

    await manager.initialize([
      { type: 'fake', connection: 'primary' },
      { type: 'replica', connection: 'replica' }
    ], [{ name: 'users', fields: { email: 'string' } }]);

    expect(calls).toEqual([
      ['connect', 'primary', 'users'],
      ['connect', 'replica', 'users']
    ]);
    expect(manager.getPrimaryDBType()).toBe('fake');
    expect(manager.getConnectedDatabases()).toEqual(['fake', 'replica']);
    expect(manager.getAdapter('missing')).toBe(manager.primaryDB);

    await manager.switchPrimaryDB('replica');
    expect(manager.getPrimaryDBType()).toBe('replica');
    expect(await manager.queryDatabase('fake', 'users', 'findById', 'u1'))
      .toEqual(expect.objectContaining({ connection: 'primary', operation: 'findOne', data: { id: 'u1' } }));
    await expect(manager.queryDatabase('missing', 'users', 'count')).rejects.toThrow('Database missing not connected');
    expect(await manager.transaction('fake', trx => `using-${trx}`)).toBe('using-trx');
    expect(await manager.replicateToAll('users', 'create', { email: 'a@example.com' }))
      .toEqual(expect.objectContaining({
        fake: expect.objectContaining({ connection: 'primary' }),
        replica: { error: 'replica unavailable' }
      }));
    expect(await manager.healthCheck()).toEqual({
      fake: { status: 'connected', connection: 'primary' },
      replica: { status: 'connected', connection: 'replica' }
    });

    await manager.closeAll();
    expect(calls).toContainEqual(['close', 'primary']);
    expect(calls).toContainEqual(['close', 'replica']);
  });

  it('reports initialization, transaction fallback, and health failures', async () => {
    class WorkingAdapter {
      async connect() {}
      async query() { return { ok: true }; }
      async healthCheck() { throw new Error('health broken'); }
    }
    class FailingAdapter {
      async connect() { throw new Error('connect broken'); }
    }

    await expect(new DatabaseManager().initialize([], [])).rejects.toThrow('No database was successfully initialized');

    const manager = new DatabaseManager();
    manager.adapterMap.working = WorkingAdapter;
    await manager.initialize([{ type: 'working', connection: {} }], []);
    expect(await manager.transaction('working', () => 'fallback')).toBe('fallback');
    expect(await manager.healthCheck()).toEqual({ working: { status: 'error', error: 'health broken' } });

    await expect(manager.switchPrimaryDB('missing')).rejects.toThrow('Database missing not connected');
    const broken = new DatabaseManager();
    broken.adapterMap.failing = FailingAdapter;
    await expect(broken.initialize([{ type: 'failing', connection: {} }], [])).rejects.toThrow('connect broken');
    await expect(broken.initialize([{ type: 'unknown', connection: {} }], [])).rejects.toThrow('Unsupported database type: unknown');
    await expect(new DatabaseManager().query('users', 'count')).rejects.toThrow('No database configured');
  });
});
