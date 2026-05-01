module.exports = {
  testEnvironment: 'node',
  rootDir: './',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'core/**/*.js',
    'adapters/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 29,
      functions: 38,
      lines: 37,
      statements: 36
    }
  },
  setupFiles: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/', '/.git/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@core/(.*)$': '<rootDir>/core/$1',
    '^@adapters/(.*)$': '<rootDir>/adapters/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1'
  },
  transform: {},
  globals: {
    NODE_ENV: 'test'
  }
};
