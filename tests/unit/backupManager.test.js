const fs = require('fs');
const zlib = require('zlib');
const BackupManager = require('../../core/backupManager');

describe('BackupManager', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('exports databases through native export or model queries', async () => {
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const manager = new BackupManager({ backupDir: 'C:/tmp/backups' });

    await expect(manager.exportDatabase({
      export: jest.fn().mockReturnValue({ version: 1, models: { users: [] } })
    })).resolves.toEqual({ version: 1, models: { users: [] } });

    const db = {
      models: [{ name: 'users' }, 'posts'],
      query: jest.fn().mockResolvedValue([{ id: 1 }])
    };

    const exported = await manager.exportDatabase(db);

    expect(exported.models).toEqual({
      users: [{ id: 1 }],
      posts: [{ id: 1 }]
    });
    expect(db.query).toHaveBeenCalledWith('users', 'findMany', {}, { limit: 100000 });
    expect(db.query).toHaveBeenCalledWith('posts', 'findMany', {}, { limit: 100000 });
  });

  it('creates compressed backups and prunes old files', async () => {
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['database-new.json.gz', 'database-old.json.gz']);
    jest.spyOn(fs, 'statSync')
      .mockReturnValueOnce({ mtime: new Date('2026-01-02') })
      .mockReturnValueOnce({ mtime: new Date('2026-01-01') });
    const manager = new BackupManager({ backupDir: 'C:/tmp/backups', retention: 1 });

    const filepath = await manager.backupDatabase({
      export: jest.fn().mockReturnValue({ models: { users: [{ id: 1 }] } })
    });

    expect(filepath).toMatch(/database-.*\.json\.gz$/);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('database-'), expect.any(Buffer));
    expect(zlib.gunzipSync(writeSpy.mock.calls[0][1]).toString('utf8')).toContain('"users"');
    expect(unlinkSpy).toHaveBeenCalledWith(expect.stringContaining('database-old.json.gz'));
  });

  it('restores compressed snapshots through database create operations', async () => {
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(zlib.gzipSync(JSON.stringify({
      models: {
        users: [{ id: 1 }, { id: 2 }]
      }
    })));
    const manager = new BackupManager({ backupDir: 'C:/tmp/backups' });
    const db = { query: jest.fn().mockResolvedValue({}) };

    await expect(manager.restoreDatabase(db, 'snapshot.json.gz')).resolves.toEqual({
      restored: true,
      models: ['users']
    });
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query).toHaveBeenCalledWith('users', 'create', { id: 1 });
  });

  it('rejects restore targets without query support and lists backups newest first', async () => {
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from(JSON.stringify({ models: {} })));
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['users-old.json', 'users-new.json', 'posts.json']);
    jest.spyOn(fs, 'statSync')
      .mockReturnValueOnce({ mtime: new Date('2026-01-01') })
      .mockReturnValueOnce({ mtime: new Date('2026-01-02') });
    const manager = new BackupManager({ backupDir: 'C:/tmp/backups' });

    await expect(manager.restoreDatabase({}, 'snapshot.json')).rejects.toThrow('query() support');
    expect(manager.listBackups('users').map(backup => backup.file)).toEqual([
      'users-new.json',
      'users-old.json'
    ]);
  });
});
