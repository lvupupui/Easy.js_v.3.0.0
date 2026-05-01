const SecurityLayer = require('../../core/security');

describe('SecurityLayer', () => {
  const encryptionKey = 'a'.repeat(64);

  it('encrypts/decrypts payloads and detects tampering', () => {
    const security = new SecurityLayer({ encryptionKey });
    const encrypted = security.encrypt({ token: 'secret' });

    expect(encrypted.encrypted).toBeDefined();
    expect(security.decrypt(encrypted)).toEqual({ token: 'secret' });
    expect(() => security.decrypt({ ...encrypted, authTag: '00'.repeat(16) })).toThrow('Data integrity');
    expect(security.encrypt(null)).toBeNull();
    expect(security.decrypt(null)).toBeNull();
  });

  it('hashes/verifies passwords and sanitizes input', () => {
    const security = new SecurityLayer({ encryptionKey });
    const hash = security.hashPassword('password', 4);

    expect(security.verifyPassword('password', hash)).toBe(true);
    expect(security.verifyPassword('wrong', hash)).toBe(false);
    expect(security.sanitizeInput('<script>alert("x")</script>')).toContain('&lt;script&gt;');
    expect(security.sanitizeInput({ safe: true })).toEqual({ safe: true });
  });

  it('validates known patterns and rejects unknown patterns', () => {
    const security = new SecurityLayer({ encryptionKey });

    expect(security.validateInput('test@example.com', 'email')).toBe(true);
    expect(security.validateInput('550e8400-e29b-41d4-a716-446655440000', 'uuid')).toBe(true);
    expect(() => security.validateInput('x', 'unknown')).toThrow('Unknown pattern');
  });

  it('generates, rotates, and verifies CSRF tokens', () => {
    const security = new SecurityLayer({ encryptionKey });
    const tokens = [];
    for (let i = 0; i < 6; i++) {
      tokens.push(security.generateCSRFToken('session-1'));
    }

    expect(security.verifyCSRFToken('session-1', tokens[0])).toBe(false);
    expect(security.verifyCSRFToken('session-1', tokens[5])).toBe(true);
    expect(security.verifyCSRFToken('missing', tokens[5])).toBe(false);
  });

  it('records, filters, cleans, and reports audit metrics', () => {
    const security = new SecurityLayer({ encryptionKey, auditRetention: 60 * 1000 });
    security.auditLog({
      action: 'login',
      userId: 'u1',
      resource: 'session',
      status: 'failed',
      severity: 'critical'
    });
    security.auditEntries.push({
      timestamp: Date.now() - (2 * 60 * 1000),
      action: 'old',
      userId: 'u2',
      severity: 'info'
    });

    expect(security.getAuditLogs({ userId: 'u1' })).toHaveLength(1);
    security.cleanupAuditLogs();
    expect(security.getAuditLogs({ action: 'old' })).toHaveLength(0);
    expect(security.getSecurityMetrics()).toEqual(expect.objectContaining({
      auditLogSize: 1,
      criticalEvents: 1,
      failedLoginAttempts: 1
    }));
  });

  it('detects injections, anonymizes data, returns headers, and reports vulnerabilities', () => {
    const security = new SecurityLayer({ encryptionKey });

    expect(security.detectSQLInjection('SELECT * FROM users; DROP TABLE users')).toBe(true);
    expect(security.detectNoSQLInjection({ password: { $ne: null } })).toBe(true);
    expect(security.checkVulnerabilities('<script>alert(1)</script>')).toContain('Potential XSS attack detected');
    expect(security.anonymizeData({ email: 'abcdef@example.com' }, ['email']).email).toMatch(/^ab\*+om$/);
    expect(security.getSecurityHeaders()).toHaveProperty('Content-Security-Policy');
  });
});
