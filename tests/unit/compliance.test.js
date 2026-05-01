const ComplianceManager = require('../../core/compliance');

describe('ComplianceManager', () => {
  it('encrypts and decrypts field values', () => {
    const compliance = new ComplianceManager({
      encryptionKey: 'unit-test-key',
      auditLogger: { info: jest.fn() }
    });

    const encrypted = compliance.encryptField('secret-value');

    expect(encrypted).not.toBe('secret-value');
    expect(compliance.decryptField(encrypted)).toBe('secret-value');
  });

  it('records audits and enforces permissions', () => {
    const auditLogger = { info: jest.fn() };
    const compliance = new ComplianceManager({ auditLogger });
    const event = compliance.audit('posts.create', 'user-1', 'posts', { id: 'p1' });

    compliance.defineRole('admin', ['*']).defineRole('editor', ['posts:create']);

    expect(event.action).toBe('posts.create');
    expect(auditLogger.info).toHaveBeenCalledWith('Audit event recorded', event);
    expect(compliance.can('admin', 'anything')).toBe(true);
    expect(compliance.can('editor', 'posts:create')).toBe(true);
    expect(compliance.can('editor', 'posts:delete')).toBe(false);
  });

  it('validates API keys and middleware access', () => {
    const compliance = new ComplianceManager({ auditLogger: { info: jest.fn() } });
    const key = compliance.createApiKey('service-a', ['posts:read']);
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    expect(compliance.verifyApiKey(key, 'posts:read')).toBe(true);
    expect(compliance.verifyApiKey(key, 'posts:write')).toBe(false);

    compliance.requireApiKey('posts:read')({ headers: { 'x-api-key': key }, query: {} }, res, next);
    expect(next).toHaveBeenCalled();

    compliance.requirePermission('posts:delete')({ user: { role: 'viewer' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('exports and erases user data for GDPR flows', () => {
    const compliance = new ComplianceManager({ auditLogger: { info: jest.fn() } });
    const user = { id: 'u1', email: 'u@example.com', name: 'User', keep: 'value' };

    expect(compliance.gdprExport(user)).toEqual(expect.objectContaining({
      subject: 'u1',
      data: user
    }));
    expect(compliance.gdprErase(user)).toEqual(expect.objectContaining({
      email: null,
      name: null,
      keep: 'value'
    }));
  });
});
