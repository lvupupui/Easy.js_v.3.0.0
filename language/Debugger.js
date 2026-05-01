class EasyDebugger {
  constructor() {
    this.breakpoints = new Map();
    this.events = [];
  }

  setBreakpoint(file, line) {
    const key = `${file}:${line}`;
    this.breakpoints.set(key, { file, line, enabled: true });
    return this.breakpoints.get(key);
  }

  removeBreakpoint(file, line) {
    return this.breakpoints.delete(`${file}:${line}`);
  }

  shouldBreak(file, line) {
    return Boolean(this.breakpoints.get(`${file}:${line}`)?.enabled);
  }

  record(event, payload = {}) {
    const entry = {
      event,
      payload,
      timestamp: new Date().toISOString()
    };
    this.events.push(entry);
    return entry;
  }

  snapshot(ast) {
    return {
      server: ast.server,
      models: (ast.models || []).map(model => model.name),
      routes: (ast.routes || []).map(route => `${route.method} ${route.path}`),
      auth: ast.auth,
      breakpoints: Array.from(this.breakpoints.values())
    };
  }
}

module.exports = EasyDebugger;
