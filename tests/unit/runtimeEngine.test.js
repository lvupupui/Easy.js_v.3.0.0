const RuntimeEngine = require('../../runtime/RuntimeEngine');

describe('RuntimeEngine startup diagnostics', () => {
  it('prints localhost for wildcard hosts and redacts database passwords', () => {
    const runtime = new RuntimeEngine();

    expect(runtime.displayHost('0.0.0.0')).toBe('localhost');
    expect(runtime.displayHost('::')).toBe('localhost');
    expect(runtime.displayHost('127.0.0.1')).toBe('127.0.0.1');
    expect(runtime.redactConnection('mongodb://user:secret@localhost:27017/app'))
      .toBe('mongodb://user:*****@localhost:27017/app');
  });

  it('logs database status from configured adapters', async () => {
    const runtime = new RuntimeEngine();
    runtime.config = {
      databases: [{ type: 'mongodb', connection: 'mongodb://localhost:27017/app' }]
    };
    runtime.db = {
      healthCheck: jest.fn().mockResolvedValue({
        mongodb: { status: 'connected' }
      })
    };

    const Logger = require('../../core/logger');
    const spy = jest.spyOn(Logger, 'info').mockImplementation(() => {});
    try {
      await runtime.logDatabaseStatus();
      expect(spy).toHaveBeenCalledWith('Database: MongoDB connected (mongodb://localhost:27017/app)');
    } finally {
      spy.mockRestore();
    }
  });
});
