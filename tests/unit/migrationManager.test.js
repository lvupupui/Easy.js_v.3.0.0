jest.mock('knex', () => jest.fn());

const fs = require('fs');
const knex = require('knex');
const MigrationManager = require('../../core/migrationManager');

describe('MigrationManager', () => {
  const createKnexMock = () => ({
    migrate: {
      latest: jest.fn().mockResolvedValue([[1], ['001_create_users.js']]),
      rollback: jest.fn().mockResolvedValue([1, ['001_create_users.js']]),
      list: jest.fn().mockResolvedValue([['done.js'], ['todo.js']])
    },
    seed: {
      run: jest.fn().mockResolvedValue(['001_seed_users.js'])
    },
    destroy: jest.fn().mockResolvedValue(undefined)
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes knex for an environment and runs migration flows', async () => {
    const knexMock = createKnexMock();
    knex.mockReturnValue(knexMock);
    const manager = new MigrationManager();

    await manager.initialize('development');

    expect(knex).toHaveBeenCalledWith(expect.objectContaining({
      client: expect.any(String)
    }));
    await expect(manager.runMigrations()).resolves.toEqual([[1], ['001_create_users.js']]);
    await expect(manager.rollbackLastMigration()).resolves.toEqual([1, ['001_create_users.js']]);
    await expect(manager.rollbackAllMigrations()).resolves.toEqual([1, ['001_create_users.js']]);
    expect(knexMock.migrate.rollback).toHaveBeenLastCalledWith({}, true);
  });

  it('creates migration and seed files from templates', async () => {
    const manager = new MigrationManager();
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

    const migrationPath = await manager.createMigration('users');
    const seedPath = await manager.createSeed('users');

    expect(migrationPath).toContain('12345_users.js');
    expect(seedPath).toContain('12345_users.js');
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('migrations'),
      expect.stringContaining("createTable('users'")
    );
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('seeds'),
      expect.stringContaining("await knex('users').insert")
    );

    dateSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('reports migration status, runs seeds, and closes knex', async () => {
    const knexMock = createKnexMock();
    const manager = new MigrationManager();
    manager.knex = knexMock;

    await expect(manager.runSeeds()).resolves.toEqual(['001_seed_users.js']);
    await expect(manager.getMigrationStatus()).resolves.toEqual({
      completed: ['done.js'],
      pending: ['todo.js']
    });
    await manager.close();

    expect(knexMock.destroy).toHaveBeenCalled();
  });

  it('surfaces initialization failures', async () => {
    const manager = new MigrationManager();

    await expect(manager.initialize('missing')).rejects.toThrow();
  });

  it('surfaces migration, seed, status, file creation, and close edge paths', async () => {
    const manager = new MigrationManager();
    manager.knex = {
      migrate: {
        latest: jest.fn()
          .mockResolvedValueOnce([0, []])
          .mockRejectedValueOnce(new Error('latest failed')),
        rollback: jest.fn()
          .mockRejectedValueOnce(new Error('rollback failed'))
          .mockRejectedValueOnce(new Error('rollback all failed')),
        list: jest.fn().mockRejectedValueOnce(new Error('list failed'))
      },
      seed: {
        run: jest.fn().mockRejectedValueOnce(new Error('seed failed'))
      },
      destroy: jest.fn()
    };

    await expect(manager.runMigrations()).resolves.toEqual([0, []]);
    await expect(manager.runMigrations()).rejects.toThrow('latest failed');
    await expect(manager.rollbackLastMigration()).rejects.toThrow('rollback failed');
    await expect(manager.rollbackAllMigrations()).rejects.toThrow('rollback all failed');
    await expect(manager.runSeeds()).rejects.toThrow('seed failed');
    await expect(manager.getMigrationStatus()).rejects.toThrow('list failed');

    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('write failed');
    });
    await expect(manager.createMigration('broken')).rejects.toThrow('write failed');
    await expect(manager.createSeed('broken')).rejects.toThrow('write failed');

    await expect(new MigrationManager().close()).resolves.toBeUndefined();
  });
});
