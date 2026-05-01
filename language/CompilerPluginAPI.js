class CompilerPluginAPI {
  constructor() {
    this.hooks = new Map();
  }

  on(hook, handler) {
    if (!this.hooks.has(hook)) this.hooks.set(hook, []);
    this.hooks.get(hook).push(handler);
    return this;
  }

  async run(hook, context) {
    let next = context;
    for (const handler of this.hooks.get(hook) || []) {
      next = await handler(next);
    }
    return next;
  }
}

CompilerPluginAPI.HOOKS = {
  BEFORE_PARSE: 'beforeParse',
  AFTER_PARSE: 'afterParse',
  BEFORE_COMPILE: 'beforeCompile',
  AFTER_COMPILE: 'afterCompile',
  BEFORE_EMIT: 'beforeEmit',
  AFTER_EMIT: 'afterEmit'
};

module.exports = CompilerPluginAPI;
