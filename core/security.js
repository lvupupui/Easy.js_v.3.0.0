/**
 * Advanced Security Layer
 * Encryption, audit logging, OWASP compliance, data protection
 */

const crypto = require('crypto');
const zlib = require('zlib');

class SecurityLayer {
  constructor(config = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
      algorithm: config.algorithm || 'aes-256-gcm',
      enableAuditLogging: config.enableAuditLogging !== false,
      enableFieldEncryption: config.enableFieldEncryption !== false,
      auditRetention: config.auditRetention || 90 * 24 * 60 * 60 * 1000, // 90 days
      sensitiveFields: config.sensitiveFields || ['password', 'token', 'secret', 'key', 'apiKey'],
      ...config
    };

    this.auditEntries = [];
    this.dataEncryption = new Map();
    this.csrfTokens = new Map();
    this.rateLimitBypass = new Set();
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext, additionalData = null) {
    if (!plaintext) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.config.algorithm, Buffer.from(this.config.encryptionKey, 'hex'), iv);

    let encrypted = cipher.update(JSON.stringify(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.config.algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;

    try {
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        Buffer.from(this.config.encryptionKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[Security] Decryption failed:', error.message);
      throw new Error('Data integrity check failed');
    }
  }

  /**
   * Hash password with salt
   */
  hashPassword(password, saltRounds = 12) {
    const salt = crypto.randomBytes(16);
    const iterations = Math.pow(2, saltRounds);
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');

    return {
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      iterations,
      algorithm: 'pbkdf2'
    };
  }

  /**
   * Verify password
   */
  verifyPassword(password, hashedPassword) {
    try {
      const hash = crypto.pbkdf2Sync(
        password,
        Buffer.from(hashedPassword.salt, 'hex'),
        hashedPassword.iterations,
        64,
        'sha512'
      );

      return hash.toString('hex') === hashedPassword.hash;
    } catch (error) {
      console.error('[Security] Password verification error:', error.message);
      return false;
    }
  }

  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate input against patterns
   */
  validateInput(input, pattern) {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      phone: /^[\d\s\-\+\(\)]+$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    };

    const regex = patterns[pattern];
    if (!regex) throw new Error(`Unknown pattern: ${pattern}`);

    return regex.test(input);
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

    if (!this.csrfTokens.has(sessionId)) {
      this.csrfTokens.set(sessionId, []);
    }

    this.csrfTokens.get(sessionId).push({ token, expiry });

    // Keep only last 5 tokens
    const tokens = this.csrfTokens.get(sessionId);
    if (tokens.length > 5) {
      tokens.shift();
    }

    return token;
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(sessionId, token) {
    const tokens = this.csrfTokens.get(sessionId);
    if (!tokens) return false;

    const now = Date.now();
    const valid = tokens.some(t => t.token === token && t.expiry > now);

    // Remove expired tokens
    this.csrfTokens.set(sessionId, tokens.filter(t => t.expiry > now));

    return valid;
  }

  /**
   * Record audit log entry
   */
  auditLog(entry) {
    if (!this.config.enableAuditLogging) return;

    const logEntry = {
      timestamp: Date.now(),
      action: entry.action,
      userId: entry.userId,
      resource: entry.resource,
      method: entry.method,
      status: entry.status,
      ip: entry.ip,
      userAgent: entry.userAgent,
      changes: entry.changes,
      severity: entry.severity || 'info'
    };

    this.auditEntries.push(logEntry);

    // Cleanup old logs
    this.cleanupAuditLogs();
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filter = {}) {
    let logs = [...this.auditEntries];

    if (filter.userId) {
      logs = logs.filter(l => l.userId === filter.userId);
    }

    if (filter.action) {
      logs = logs.filter(l => l.action === filter.action);
    }

    if (filter.severity) {
      logs = logs.filter(l => l.severity === filter.severity);
    }

    if (filter.startDate) {
      logs = logs.filter(l => l.timestamp >= filter.startDate);
    }

    if (filter.endDate) {
      logs = logs.filter(l => l.timestamp <= filter.endDate);
    }

    return logs.slice(-1000); // Return last 1000
  }

  /**
   * Cleanup old audit logs
   */
  cleanupAuditLogs() {
    const cutoff = Date.now() - this.config.auditRetention;
    this.auditEntries = this.auditEntries.filter(log => log.timestamp > cutoff);
  }

  /**
   * Detect and prevent SQL injection
   */
  detectSQLInjection(input) {
    if (typeof input !== 'string') return false;

    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bEXEC\b.*\()/i,
      /(;\s*DROP)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect and prevent NoSQL injection
   */
  detectNoSQLInjection(input) {
    if (typeof input === 'object') {
      const str = JSON.stringify(input);
      return /(\$where|\$regex|\$or|\$and|\$ne|\$gt|\$gte|\$lt|\$lte)/i.test(str);
    }
    return false;
  }

  /**
   * Data anonymization for compliance
   */
  anonymizeData(data, fieldsToAnonymize = []) {
    const anonymized = { ...data };

    fieldsToAnonymize.forEach(field => {
      if (anonymized[field]) {
        const fieldValue = anonymized[field].toString();
        const masked = fieldValue.substring(0, 2) + '*'.repeat(fieldValue.length - 4) + fieldValue.substring(fieldValue.length - 2);
        anonymized[field] = masked;
      }
    });

    return anonymized;
  }

  /**
   * Generate security headers
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none'
    };
  }

  /**
   * Check for vulnerable patterns
   */
  checkVulnerabilities(data) {
    const vulnerabilities = [];

    if (this.detectSQLInjection(data)) {
      vulnerabilities.push('Potential SQL injection detected');
    }

    if (this.detectNoSQLInjection(data)) {
      vulnerabilities.push('Potential NoSQL injection detected');
    }

    if (typeof data === 'string' && data.includes('<script')) {
      vulnerabilities.push('Potential XSS attack detected');
    }

    return vulnerabilities;
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    const auditEntries = this.auditEntries.length;
    const criticalEntries = this.auditEntries.filter(l => l.severity === 'critical').length;
    const failedLogins = this.auditEntries.filter(l => l.action === 'login' && l.status === 'failed').length;

    return {
      auditLogSize: auditEntries,
      criticalEvents: criticalEntries,
      failedLoginAttempts: failedLogins,
      csrfTokensActive: this.csrfTokens.size,
      encryptedDataCount: this.dataEncryption.size
    };
  }
}

module.exports = SecurityLayer;
