const TestHelper = require('../helpers');
const Factory = require('../factories');

describe('Utility Functions', () => {
  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      expect(TestHelper.isValidEmail('user@example.com')).toBe(true);
      expect(TestHelper.isValidEmail('test.user@example.co.uk')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(TestHelper.isValidEmail('invalid')).toBe(false);
      expect(TestHelper.isValidEmail('invalid@')).toBe(false);
      expect(TestHelper.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      const uuid = TestHelper.generateRandomUUID();
      expect(TestHelper.isValidUUID(uuid)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(TestHelper.isValidUUID('not-a-uuid')).toBe(false);
      expect(TestHelper.isValidUUID('12345678')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(TestHelper.isValidURL('http://example.com')).toBe(true);
      expect(TestHelper.isValidURL('https://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(TestHelper.isValidURL('not a url')).toBe(false);
    });
  });

  describe('Random Data Generation', () => {
    it('should generate random strings', () => {
      const str1 = TestHelper.generateRandomString(10);
      const str2 = TestHelper.generateRandomString(10);
      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    it('should generate valid emails', () => {
      const email = TestHelper.generateRandomEmail();
      expect(TestHelper.isValidEmail(email)).toBe(true);
    });

    it('should generate valid phone numbers', () => {
      const phone = TestHelper.generateRandomPhone();
      expect(phone).toMatch(/^\+1\d{10}$/);
    });
  });

  describe('Factory Functions', () => {
    it('should create user with correct structure', () => {
      const user = Factory.user();
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('role', 'user');
    });

    it('should create admin with correct role', () => {
      const admin = Factory.admin();
      expect(admin.role).toBe('admin');
    });

    it('should override factory defaults', () => {
      const user = Factory.user({ name: 'Custom Name', role: 'moderator' });
      expect(user.name).toBe('Custom Name');
      expect(user.role).toBe('moderator');
    });

    it('should create batch of items', () => {
      const posts = Factory.batch(Factory.post, 5);
      expect(posts).toHaveLength(5);
      posts.forEach(post => {
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
      });
    });
  });
});
