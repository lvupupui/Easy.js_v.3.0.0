const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const packagePath = path.join(root, 'package.json');
const logoPath = path.join(root, 'public', 'easyjs-logo.svg');

function fail(message) {
  console.error(`Package README check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(readmePath)) {
  fail('README.md is missing.');
}

const readme = fs.readFileSync(readmePath, 'utf8');
if (readme.length < 1000) {
  fail('README.md is too small to be useful on npm.');
}

for (const requiredText of [
  'npm install easybackend.js',
  'npx easybackend.js create my-api',
  'START SERVER 3000',
  'Live Adapter Validation'
]) {
  if (!readme.includes(requiredText)) {
    fail(`README.md is missing required text: ${requiredText}`);
  }
}

if (!fs.existsSync(logoPath)) {
  fail('public/easyjs-logo.svg is missing.');
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!Array.isArray(pkg.files) || !pkg.files.includes('README.md')) {
  fail('package.json files must include README.md.');
}

console.log('Package README check passed.');
