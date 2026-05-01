// Test factory functions for creating test data

class Factory {
  static user(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      email: `user-${Math.random().toString(36).substring(7)}@example.com`,
      password: 'hashedPassword123',
      name: 'Test User',
      role: 'user',
      verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }

  static admin(overrides = {}) {
    return Factory.user({
      role: 'admin',
      ...overrides
    });
  }

  static post(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      userId: Math.floor(Math.random() * 1000),
      title: 'Test Post Title',
      content: 'This is test content for the post',
      published: true,
      views: 0,
      likes: 0,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }

  static comment(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      postId: Math.floor(Math.random() * 1000),
      userId: Math.floor(Math.random() * 1000),
      content: 'Test comment content',
      approved: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }

  static apiKey(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      key: `sk_${Math.random().toString(36).substring(2)}`,
      name: 'Test API Key',
      userId: Math.floor(Math.random() * 1000),
      lastUsed: new Date(),
      created_at: new Date(),
      ...overrides
    };
  }

  static batch(factory, count, overrides = {}) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(factory({ ...overrides, id: i + 1 }));
    }
    return items;
  }
}

module.exports = Factory;
