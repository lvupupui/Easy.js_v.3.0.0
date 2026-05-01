const fs = require('fs');
const path = require('path');
const Parser = require('../parser/Parser');
const Compiler = require('../compiler/Compiler');
const EasyJS = require('../index');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(relativePath) {
  assert(fs.existsSync(path.resolve(__dirname, '..', relativePath)), `Missing ${relativePath}`);
}

async function main() {
  require('./verify-package-readme');

  assertFile('Dockerfile');
  assertFile('docker-compose.yml');
  assertFile('.env.example');
  assertFile('.github/workflows/ci.yml');
  assertFile('examples/quickstart.easy');

  const source = fs.readFileSync(path.resolve(__dirname, '..', 'examples/quickstart.easy'), 'utf8');
  const config = new Compiler().compile(new Parser().parse(source));

  assert(config.server?.port, 'Quickstart must compile a server port');
  assert(config.databases?.length > 0, 'Quickstart must compile at least one database');
  assert(config.models?.length > 0, 'Quickstart must compile at least one model');
  assert(config.routes?.length > 0, 'Quickstart must compile routes');

  for (const exportName of [
    'AppFactory',
    'DatabaseManager',
    'MigrationManager',
    'ApiToolkit',
    'PluginSystem',
    'AIProviderManager'
  ]) {
    assert(EasyJS[exportName], `Public export missing: ${exportName}`);
  }

  console.log('Production smoke validation passed');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
