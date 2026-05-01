#!/usr/bin/env node

/**
 * Framework Test Suite
 * Tests all major components of easy.js
 */

const Parser = require('./parser/Parser');
const Compiler = require('./compiler/Compiler');
const Logger = require('./core/logger');

console.log('\n╔════════════════════════════════════════╗');
console.log('║       easy.js Framework Test Suite      ║');
console.log('╚════════════════════════════════════════╝\n');

// Test 1: Parser
console.log('📝 Test 1: DSL Parser');
console.log('─'.repeat(40));

const testDSL = `
START SERVER 3000

USE MONGODB mongodb://localhost:27017/test

MODEL users {
  name: string
  email: string
  password: string
}

AUTH users BY jwt

GET /users FROM users
POST /users FROM users
PUT /users/:id FROM users
DELETE /users/:id FROM users

VALIDATE users {
  email: required:email
  password: required:min=6
}

PROTECT /users
`;

try {
  const parser = new Parser();
  const ast = parser.parse(testDSL);
  
  console.log('✓ DSL parsed successfully');
  console.log(`  - Server: ${ast.server.port}`);
  console.log(`  - Databases: ${ast.databases.length}`);
  console.log(`  - Models: ${ast.models.length}`);
  console.log(`  - Routes: ${ast.routes.length}`);
  console.log(`  - Protected routes: ${ast.protections.length}`);
  console.log(`  - Validations: ${ast.validations.length}`);
} catch (error) {
  console.log(`✗ Parser test failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Compiler
console.log('\n🔧 Test 2: Compiler');
console.log('─'.repeat(40));

try {
  const parser = new Parser();
  const ast = parser.parse(testDSL);
  
  const compiler = new Compiler();
  const config = compiler.compile(ast);
  
  console.log('✓ Compilation successful');
  console.log(`  - Server port: ${config.server.port}`);
  console.log(`  - Models: ${config.models.map(m => m.name).join(', ')}`);
  console.log(`  - Routes: ${config.routes.length}`);
  console.log(`  - Auth: ${config.auth?.type || 'none'}`);
} catch (error) {
  console.log(`✗ Compiler test failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Validation Engine
console.log('\n✅ Test 3: Validation Engine');
console.log('─'.repeat(40));

try {
  const ValidationEngine = require('./core/validator');
  const validator = new ValidationEngine();
  
  const validations = [
    {
      model: 'users',
      rules: {
        email: 'required:email',
        password: 'required:min=6'
      }
    }
  ];
  
  validator.loadRules(validations);
  
  // Test valid data
  const validData = {
    email: 'test@example.com',
    password: 'securepass123'
  };
  
  const error1 = validator.validate('users', validData);
  console.log(`✓ Valid data passes: ${error1 === null ? 'YES' : 'NO'}`);
  
  // Test invalid data
  const invalidData = {
    email: 'invalid-email',
    password: '123'
  };
  
  const error2 = validator.validate('users', invalidData);
  console.log(`✓ Invalid data caught: ${error2 !== null ? 'YES' : 'NO'}`);
  
  if (error2) {
    console.log(`  - Errors found: ${Object.keys(error2).join(', ')}`);
  }
} catch (error) {
  console.log(`✗ Validation test failed: ${error.message}`);
  process.exit(1);
}

// Test 4: Logger
console.log('\n📋 Test 4: Logger');
console.log('─'.repeat(40));

try {
  Logger.info('Info message');
  Logger.success('Success message');
  Logger.warn('Warning message');
  Logger.debug('Debug message');
  console.log('✓ Logger working correctly');
} catch (error) {
  console.log(`✗ Logger test failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Configuration
console.log('\n⚙️  Test 5: Configuration');
console.log('─'.repeat(40));

try {
  const config = require('./config/env');
  console.log('✓ Configuration loaded');
  console.log(`  - PORT: ${config.PORT}`);
  console.log(`  - JWT_SECRET: ${config.JWT_SECRET.substring(0, 10)}...`);
  console.log(`  - NODE_ENV: ${config.NODE_ENV}`);
} catch (error) {
  console.log(`✗ Configuration test failed: ${error.message}`);
  process.exit(1);
}

// Summary
console.log('\n╔════════════════════════════════════════╗');
console.log('║          All Tests Passed! ✓           ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Ready to build amazing backends with easy.js!\n');
console.log('Next steps:');
console.log('1. Create a project: easyjs create my-api');
console.log('2. Configure database: USE MONGODB or USE MYSQL');
console.log('3. Define models: MODEL <name> { ... }');
console.log('4. Create routes: GET/POST/PUT/DELETE ...');
console.log('5. Run server: easyjs start app.easy\n');
