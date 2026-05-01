const EnterpriseAuth = require('../../core/enterpriseAuth');

describe('EnterpriseAuth', () => {
  it('registers OAuth2 providers and generates authorization data', () => {
    const auth = new EnterpriseAuth();
    auth.registerOAuth2Provider('github', {
      clientId: 'client',
      clientSecret: 'secret',
      authorizationUrl: 'https://auth.example/authorize',
      tokenUrl: 'https://auth.example/token',
      userInfoUrl: 'https://auth.example/user',
      redirectUri: 'https://app.example/callback',
      scopes: ['openid', 'email']
    });

    const authUrl = auth.getOAuth2AuthUrl('github');

    expect(authUrl.url).toContain('client_id=client');
    expect(authUrl.url).toContain('scope=openid email');
    expect(authUrl.state).toHaveLength(64);
    expect(authUrl.codeChallenge).toHaveLength(64);
    expect(() => auth.getOAuth2AuthUrl('missing')).toThrow('not configured');
  });

  it('generates MFA secrets, verifies TOTP, and consumes backup codes once', () => {
    const auth = new EnterpriseAuth();
    const mfa = auth.generateMFASecret('u1');
    const mfaData = auth.mfaSecrets.get('u1');
    const decoder = new (require('base32.js').Decoder)();
    const secret = decoder.write(mfaData.secret).finalize();
    const token = auth.generateTOTPToken(secret, Math.floor(Date.now() / 1000 / auth.config.mfaWindow));

    expect(mfa.qrUrl).toContain('otpauth://totp/u1');
    expect(auth.verifyTOTP('u1', token)).toBe(true);
    expect(auth.enableMFA('u1', token)).toEqual({ success: true, backupCodes: mfa.backupCodes });

    const backupCode = mfa.backupCodes[0];
    expect(auth.verifyBackupCode('u1', backupCode.toLowerCase())).toBe(true);
    expect(auth.verifyBackupCode('u1', backupCode)).toBe(false);
    expect(() => auth.verifyTOTP('missing', token)).toThrow('MFA not configured');
  });

  it('creates, validates, expires, and logs out sessions', async () => {
    const auth = new EnterpriseAuth({ sessionTimeout: 10 });
    const sessionId = await auth.createSession('u1', true);

    expect(auth.validateSession(sessionId)).toEqual(expect.objectContaining({
      userId: 'u1',
      mfaPending: true,
      mfaVerified: false
    }));

    auth.sessions.get(sessionId).lastActivity = Date.now() - 100;
    expect(() => auth.validateSession(sessionId)).toThrow('Session expired');

    const nextSession = await auth.createSession('u1');
    auth.logout(nextSession);
    expect(() => auth.validateSession(nextSession)).toThrow('Invalid session');
  });

  it('generates, verifies, refreshes, and rejects mismatched JWT token types', async () => {
    const auth = new EnterpriseAuth({
      jwtSecret: 'shared-test-secret',
      refreshTokenSecret: 'shared-test-secret',
      accessTokenExpiry: '1h',
      refreshTokenExpiry: '1h'
    });
    const sessionId = await auth.createSession('u1');
    const tokens = auth.generateTokens('u1', sessionId);

    expect(auth.verifyToken(tokens.accessToken)).toEqual(expect.objectContaining({
      userId: 'u1',
      sessionId,
      type: 'access'
    }));
    expect(auth.verifyToken(tokens.refreshToken, 'refresh')).toEqual(expect.objectContaining({
      type: 'refresh'
    }));
    expect(auth.verifyToken(auth.refreshAccessToken(tokens.refreshToken))).toEqual(expect.objectContaining({
      type: 'access'
    }));
    expect(() => auth.verifyToken(tokens.refreshToken)).toThrow('Invalid token type');
    expect(() => auth.refreshAccessToken(tokens.accessToken)).toThrow('Failed to refresh token');
  });

  it('tracks lockouts, cleanup, and authentication statistics', async () => {
    const auth = new EnterpriseAuth({ sessionTimeout: 10 });
    auth.checkLoginAttempts('u1');
    for (let i = 0; i < auth.maxLoginAttempts; i++) {
      auth.recordFailedAttempt('u1');
    }

    expect(() => auth.checkLoginAttempts('u1')).toThrow('Account locked');
    expect(auth.getStats().lockedAccounts).toBe(1);

    auth.clearLoginAttempts('u1');
    expect(auth.checkLoginAttempts('u1')).toBe(true);

    const sessionId = await auth.createSession('u1');
    auth.sessions.get(sessionId).lastActivity = Date.now() - 100;
    auth.cleanupSessions();
    expect(auth.getStats()).toEqual(expect.objectContaining({
      activeSessions: 0,
      oauth2Providers: 0
    }));
  });
});
