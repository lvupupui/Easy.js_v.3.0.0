class Logger {
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  static log(message, color = 'white') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors[color]}[${timestamp}] ${message}${this.colors.reset}`);
  }

  static info(message) {
    this.log(message, 'cyan');
  }

  static success(message) {
    this.log(message, 'green');
  }

  static warn(message) {
    this.log(`WARN: ${message}`, 'yellow');
  }

  static error(message) {
    this.log(`ERROR: ${message}`, 'red');
  }

  static debug(message) {
    if (process.env.DEBUG) {
      this.log(`[DEBUG] ${message}`, 'dim');
    }
  }
}

module.exports = Logger;
