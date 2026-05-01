const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Factory = require('./factories');

class TestHelper {
  // Auth helpers
  static generateJWT(userId = 1, role = 'user') {
    return jwt.sign(
      { userId, role, iat: Math.floor(Date.now() / 1000) },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '24h' }
    );
  }

  static generateAuthHeaders(userId = 1, role = 'user') {
    const token = this.generateJWT(userId, role);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static generateInvalidToken() {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';
  }

  // Database helpers
  static async cleanupDatabase(db) {
    if (db && db.adapters) {
      try {
        for (const [, adapter] of Object.entries(db.adapters)) {
          if (adapter.close) {
            await adapter.close();
          }
        }
      } catch (error) {
        console.error('Error cleaning database:', error);
      }
    }
  }

  // Mock response helpers
  static mockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.header = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  }

  static mockRequest(overrides = {}) {
    return {
      method: 'GET',
      url: '/',
      headers: {},
      body: {},
      params: {},
      query: {},
      user: Factory.user(),
      ...overrides
    };
  }

  static mockNext() {
    return jest.fn();
  }

  // Assertion helpers
  static expectValidResponse(res, statusCode = 200) {
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.json).toHaveBeenCalled();
  }

  static expectErrorResponse(res, statusCode = 400) {
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.json).toHaveBeenCalled();
  }

  static expectAuthError(res) {
    expect(res.status).toHaveBeenCalledWith(401);
  }

  // Data generators
  static generateRandomString(length = 10) {
    let value = '';
    while (value.length < length) {
      value += Math.random().toString(36).slice(2);
    }
    return value.slice(0, length);
  }

  static generateRandomEmail() {
    return `${this.generateRandomString()}@example.com`;
  }

  static generateRandomPhone() {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  }

  static generateRandomUUID() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return [
      crypto.randomBytes(4).toString('hex'),
      crypto.randomBytes(2).toString('hex'),
      crypto.randomBytes(2).toString('hex'),
      crypto.randomBytes(2).toString('hex'),
      crypto.randomBytes(6).toString('hex')
    ].join('-');
  }

  // Timing helpers
  static async waitFor(condition, maxWaitTime = 5000, checkInterval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      if (condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    return false;
  }

  // Data validation helpers
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidUUID(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }

  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = TestHelper;
