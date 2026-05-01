module.exports = {
  apps: [
    {
      name: 'easyjs',
      script: 'index.js',
      args: 'examples/quickstart.easy',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '512M',
      kill_timeout: 10000
    }
  ]
};
