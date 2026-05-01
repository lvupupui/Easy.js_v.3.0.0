const fs = require('fs');
const path = require('path');
const CLI = require('../../cli/index');

describe('CLI defaults', () => {
  it('falls back to bundled quickstart when no project src/app.easy exists', () => {
    const cli = new CLI(['node', 'cli/index.js', 'typecheck']);

    expect(fs.existsSync(path.resolve(process.cwd(), 'src/app.easy'))).toBe(false);
    expect(cli.defaultEasyFile()).toBe('examples/quickstart.easy');
  });
});
