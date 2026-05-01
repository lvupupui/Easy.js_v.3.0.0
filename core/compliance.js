const crypto = require('crypto');
const loggerWinston = require('./loggerWinston');

class ComplianceManager {
  constructor(config = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || process.env.FIELD_ENCRYPTION_KEY || 'easyjs-development-key',
      auditLogger: config.auditLogger || loggerWinston,
      ...config
    };
    this.auditEvents = [];
    this.permissions = new Map();
    this.apiKeys = new Map();
  }

  encryptField(value) {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(this.config.encryptionKey).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptField(payload) {
    const [ivHex, encryptedHex] = String(payload).split(':');
    const key = crypto.createHash('sha256').update(this.config.encryptionKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]).toString('utf8');
  }

  audit(action, actor, resource, metadata = {}) {
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      action,
      actor,
      resource,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.auditEvents.push(event);
    this.config.auditLogger.info('Audit event recorded', event);
    return event;
  }

  defineRole(role, permissions = []) {
    this.permissions.set(role, new Set(permissions));
    return this;
  }

  can(role, permission) {
    const permissions = this.permissions.get(role);
    return Boolean(permissions && (permissions.has(permission) || permissions.has('*')));
  }

  requirePermission(permission) {
    return (req, res, next) => {
      if (!this.can(req.user?.role, permission)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
      next();
    };
  }

  createApiKey(owner, scopes = []) {
    const rawKey = `ejs_${crypto.randomBytes(32).toString('hex')}`;
    const hash = this.hashApiKey(rawKey);
    this.apiKeys.set(hash, { owner, scopes, createdAt: new Date().toISOString(), active: true });
    return rawKey;
  }

  verifyApiKey(rawKey, requiredScope = null) {
    const key = this.apiKeys.get(this.hashApiKey(rawKey));
    if (!key || !key.active) return false;
    return !requiredScope || key.scopes.includes(requiredScope) || key.scopes.includes('*');
  }

  requireApiKey(requiredScope = null) {
    return (req, res, next) => {
      const rawKey = req.headers['x-api-key'] || req.query.apiKey;
      if (!rawKey || !this.verifyApiKey(rawKey, requiredScope)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'A valid API key is required'
          }
        });
      }
      next();
    };
  }

  hashApiKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  gdprExport(user) {
    return {
      exportedAt: new Date().toISOString(),
      subject: user.id || user.email,
      data: user
    };
  }

  gdprErase(record, fields = ['name', 'email', 'phone', 'address']) {
    const erased = { ...record, erasedAt: new Date().toISOString() };
    for (const field of fields) {
      if (field in erased) erased[field] = null;
    }
    return erased;
  }
}

module.exports = ComplianceManager;
