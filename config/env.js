require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',

  // Database
  MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017/easyjs',
  MYSQL_URL: process.env.MYSQL_URL || 'mysql://root:root@localhost:3306/easyjs',

  // Redis (Optional)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // AI providers
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5.1',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',

  // Security
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,

  // Debugging
  DEBUG: process.env.DEBUG === 'true' || false,

  // Validation
  getConfig() {
    if (!this.JWT_SECRET || this.JWT_SECRET.includes('default')) {
      if (this.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
    }
    return this;
  }
};
