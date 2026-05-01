const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const loggerWinston = require('./loggerWinston');

class BackupManager {
  constructor(config = {}) {
    this.config = {
      backupDir: config.backupDir || path.join(process.cwd(), 'backups'),
      compress: config.compress !== false,
      retention: config.retention || 10,
      ...config
    };
    fs.mkdirSync(this.config.backupDir, { recursive: true });
  }

  async backupDatabase(db, name = 'database') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.json${this.config.compress ? '.gz' : ''}`;
    const filepath = path.join(this.config.backupDir, filename);
    const data = await this.exportDatabase(db);
    const payload = Buffer.from(JSON.stringify(data, null, 2));

    fs.writeFileSync(filepath, this.config.compress ? zlib.gzipSync(payload) : payload);
    this.pruneOldBackups(name);
    loggerWinston.info('Database backup created', { filepath });
    return filepath;
  }

  async restoreDatabase(db, filepath) {
    const raw = fs.readFileSync(filepath);
    const json = filepath.endsWith('.gz') ? zlib.gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    const snapshot = JSON.parse(json);

    if (!db || typeof db.query !== 'function') {
      throw new Error('Restore requires a database manager with query() support');
    }

    for (const [model, rows] of Object.entries(snapshot.models || {})) {
      for (const row of rows) {
        await db.query(model, 'create', row);
      }
    }

    loggerWinston.info('Database restore completed', { filepath });
    return { restored: true, models: Object.keys(snapshot.models || {}) };
  }

  async exportDatabase(db) {
    if (db && typeof db.export === 'function') {
      return db.export();
    }

    const models = {};
    const configuredModels = db?.models || db?.config?.models || [];
    for (const model of configuredModels) {
      const name = model.name || model;
      models[name] = await db.query(name, 'findMany', {}, { limit: 100000 });
    }

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      models
    };
  }

  listBackups(name = null) {
    return fs.readdirSync(this.config.backupDir)
      .filter(file => !name || file.startsWith(`${name}-`))
      .map(file => ({
        file,
        path: path.join(this.config.backupDir, file),
        createdAt: fs.statSync(path.join(this.config.backupDir, file)).mtime
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  pruneOldBackups(name) {
    const backups = this.listBackups(name);
    for (const backup of backups.slice(this.config.retention)) {
      fs.unlinkSync(backup.path);
    }
  }
}

module.exports = BackupManager;
