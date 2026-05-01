const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: options.cwd || root,
    stdio: 'inherit'
  });
}

function runNpm(args, options = {}) {
  if (npmCli) {
    run(process.execPath, [npmCli, ...args], options);
    return;
  }
  run('npm', args, options);
}

function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-release-'));
  const packDir = path.join(temp, 'pack');
  const consumerDir = path.join(temp, 'consumer');
  fs.mkdirSync(packDir);
  fs.mkdirSync(consumerDir);

  try {
    runNpm(['test', '--', '--runInBand']);
    runNpm(['run', 'validate:production']);
    runNpm(['pack', '--dry-run', '--cache', path.join(temp, 'npm-cache')]);
    runNpm(['pack', '--pack-destination', packDir, '--cache', path.join(temp, 'npm-cache')]);

    const tarball = fs.readdirSync(packDir).find(file => file.endsWith('.tgz'));
    if (!tarball) {
      throw new Error('npm pack did not produce a tarball');
    }

    runNpm(['init', '-y'], { cwd: consumerDir });
    runNpm([
      'install',
      path.join(packDir, tarball),
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--cache',
      path.join(temp, 'npm-cache')
    ], { cwd: consumerDir });

    execFileSync('node', ['-e', "require('easybackend.js'); console.log('require ok')"], {
      cwd: consumerDir,
      stdio: 'inherit'
    });

    const cliPath = path.join(consumerDir, 'node_modules', 'easybackend.js', 'cli', 'index.js');
    run('node', [cliPath, 'create', 'smoke-api', '--ui', 'bootstrap'], { cwd: consumerDir });

    for (const required of [
      path.join(consumerDir, 'smoke-api', 'template', 'index.html'),
      path.join(consumerDir, 'smoke-api', 'template', 'styles.css'),
      path.join(consumerDir, 'smoke-api', 'template', 'api.js'),
      path.join(consumerDir, 'smoke-api', 'template', 'app.js')
    ]) {
      if (!fs.existsSync(required)) {
        throw new Error(`Missing generated file: ${required}`);
      }
    }

    console.log('\nRelease check passed.');
  } finally {
    if (process.env.KEEP_RELEASE_CHECK !== '1') {
      fs.rmSync(temp, { recursive: true, force: true });
    } else {
      console.log(`Kept release check directory: ${temp}`);
    }
  }
}

main();
