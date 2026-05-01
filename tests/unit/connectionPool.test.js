const ConnectionPool = require('../../core/connectionPool');

const createConnectionFactory = () => {
  let id = 0;
  return jest.fn(async () => ({
    id: ++id,
    ping: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined)
  }));
};

describe('ConnectionPool hardening', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes the minimum pool and keeps active/idle stats consistent', async () => {
    const pool = new ConnectionPool({ minConnections: 2, healthCheckInterval: 100000 });
    await pool.init(createConnectionFactory());

    expect(pool.getStats()).toMatchObject({
      totalConnections: 2,
      activeConnections: 0,
      idleConnections: 2,
      idleCount: 2
    });

    const conn = await pool.getConnection();
    expect(pool.getStats()).toMatchObject({
      activeConnections: 1,
      idleConnections: 1,
      activeCount: 1,
      idleCount: 1
    });

    pool.releaseConnection(conn);
    pool.releaseConnection(conn);

    expect(pool.getStats()).toMatchObject({
      activeConnections: 0,
      idleConnections: 2,
      activeCount: 0,
      idleCount: 2
    });

    await pool.drain();
  });

  it('hands a released connection to the next queued request without timing out later', async () => {
    const pool = new ConnectionPool({
      minConnections: 1,
      maxConnections: 1,
      connectionTimeout: 1000,
      healthCheckInterval: 100000
    });
    await pool.init(createConnectionFactory());

    const first = await pool.getConnection();
    const waiting = pool.getConnection();
    expect(pool.getStats().waitingRequests).toBe(1);

    pool.releaseConnection(first);

    await expect(waiting).resolves.toBe(first);
    expect(pool.getStats()).toMatchObject({
      waitingRequests: 0,
      activeConnections: 1
    });

    pool.releaseConnection(first);
    await pool.drain();
  });

  it('retries connection creation failures before surfacing an error', async () => {
    const pool = new ConnectionPool({
      minConnections: 0,
      retryAttempts: 2,
      retryDelay: 1,
      healthCheckInterval: 100000
    });
    const factory = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce({ close: jest.fn() });
    pool.connectionFactory = factory;

    await expect(pool.createConnection()).resolves.toBeDefined();

    expect(factory).toHaveBeenCalledTimes(2);
    expect(pool.getStats()).toMatchObject({
      failedAttempts: 1,
      successfulConnections: 1,
      totalConnections: 1
    });

    await pool.drain();
  });

  it('removes unhealthy connections during health checks and preserves min scaling', async () => {
    const pool = new ConnectionPool({
      minConnections: 1,
      maxConnections: 3,
      enableAutoScaling: false,
      healthCheckInterval: 100000
    });
    const healthy = { ping: jest.fn().mockResolvedValue(true), close: jest.fn() };
    const unhealthy = { ping: jest.fn().mockRejectedValue(new Error('down')), close: jest.fn() };
    const factory = jest.fn()
      .mockResolvedValueOnce(healthy)
      .mockResolvedValueOnce(unhealthy);

    await pool.init(factory);
    await pool.createConnection();
    pool.stats.idleCount = 2;

    await pool.healthCheck();

    expect(pool.connections).toEqual([healthy]);
    expect(unhealthy.close).toHaveBeenCalled();
    expect(pool.getStats()).toMatchObject({
      totalConnections: 1,
      totalDestroyed: 1,
      idleConnections: 1
    });

    await pool.drain();
  });

  it('reports zero utilization for an empty pool instead of NaN', () => {
    const pool = new ConnectionPool({ minConnections: 0 });

    expect(pool.getStats().utilizationPercent).toBe('0.00%');
  });

  it('queues timeout requests, falls through failed scale-up creation, and tests default health', async () => {
    jest.useFakeTimers();
    const pool = new ConnectionPool({
      minConnections: 0,
      maxConnections: 1,
      connectionTimeout: 50,
      retryAttempts: 0,
      healthCheckInterval: 100000
    });
    const factory = jest.fn().mockRejectedValue(new Error('factory down'));
    pool.connectionFactory = factory;

    const assertion = expect(pool.getConnection(50)).rejects.toThrow('Connection timeout');
    await jest.advanceTimersByTimeAsync(50);
    await assertion;
    expect(pool.stats.waitingCount).toBe(0);
    expect(pool.stats.failedAttempts).toBe(1);
    await expect(pool.testConnection({})).resolves.toBe(true);
  });

  it('auto-scales up and down while tolerating create and close failures', async () => {
    const pool = new ConnectionPool({
      minConnections: 1,
      maxConnections: 4,
      retryAttempts: 0,
      healthCheckInterval: 100000
    });
    let id = 0;
    const factory = jest.fn(async () => ({ id: ++id, close: jest.fn() }));
    await pool.init(factory);
    while (pool.connections.length < 3) {
      await pool.createConnection();
    }

    pool.activeConnections.add(pool.connections[0]);
    pool.activeConnections.add(pool.connections[1]);
    pool.activeConnections.add(pool.connections[2]);
    await pool.autoScale();
    expect(pool.connections.length).toBe(4);

    pool.activeConnections.clear();
    pool.connections[0].close = jest.fn(() => {
      throw new Error('close failed');
    });
    await pool.autoScale();
    expect(pool.connections.length).toBeLessThan(4);
    expect(pool.stats.totalDestroyed).toBeGreaterThan(0);

    factory.mockRejectedValueOnce(new Error('scale failed'));
    pool.activeConnections = new Set(pool.connections);
    await expect(pool.autoScale()).resolves.toBeUndefined();
    pool.activeConnections.clear();
    await pool.drain();
  });

  it('runs periodic health checks and drains after active connections are released', async () => {
    jest.useFakeTimers();
    const pool = new ConnectionPool({
      minConnections: 1,
      healthCheckInterval: 10
    });
    const conn = { ping: jest.fn().mockResolvedValue(true), close: jest.fn().mockResolvedValue() };
    await pool.init(jest.fn().mockResolvedValue(conn));
    const healthSpy = jest.spyOn(pool, 'healthCheck').mockResolvedValue();

    jest.advanceTimersByTime(10);
    expect(healthSpy).toHaveBeenCalled();

    const active = await pool.getConnection();
    const drain = pool.drain();
    await jest.advanceTimersByTimeAsync(100);
    pool.releaseConnection(active);
    await jest.advanceTimersByTimeAsync(100);
    await drain;

    expect(pool.healthCheckTimer).toBeNull();
    expect(conn.close).toHaveBeenCalled();
    expect(pool.getStats()).toMatchObject({
      totalConnections: 0,
      activeCount: 0,
      waitingCount: 0
    });
  });
});
