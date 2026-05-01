/**
 * Plugin System & Code Generation
 * Extensible plugin architecture with hot reloading and code generation
 */

const EventEmitter = require('events');

class PluginSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      pluginDir: config.pluginDir || './plugins',
      autoLoad: config.autoLoad !== false,
      enableHotReload: config.enableHotReload !== false,
      enableCodeGen: config.enableCodeGen !== false,
      ...config
    };

    this.plugins = new Map();
    this.hooks = new Map();
    this.generators = new Map();
    this.middleware = [];
    this.validators = [];
  }

  /**
   * Register plugin
   */
  registerPlugin(pluginName, plugin) {
    if (!plugin.name || !plugin.version) {
      throw new Error('Plugin must have name and version');
    }

    const pluginConfig = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      author: plugin.author || '',
      dependencies: plugin.dependencies || [],
      hooks: plugin.hooks || {},
      middleware: plugin.middleware || [],
      validators: plugin.validators || [],
      commands: plugin.commands || [],
      generators: plugin.generators || {},
      instance: null
    };

    // Check dependencies
    for (const dep of pluginConfig.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin dependency not found: ${dep}`);
      }
    }

    // Initialize plugin if it has init method
    if (plugin.init) {
      pluginConfig.instance = new plugin.init();
    }

    this.plugins.set(pluginName, pluginConfig);

    // Register hooks
    for (const [hookName, handler] of Object.entries(pluginConfig.hooks)) {
      this.registerHook(hookName, handler, pluginName);
    }

    // Register middleware
    for (const mw of pluginConfig.middleware) {
      this.middleware.push({ name: pluginName, middleware: mw });
    }

    // Register validators
    for (const validator of pluginConfig.validators) {
      this.validators.push({ name: pluginName, validator });
    }

    // Register code generators
    for (const [genName, generator] of Object.entries(pluginConfig.generators)) {
      this.registerGenerator(genName, generator, pluginName);
    }

    console.log(`[PluginSystem] Plugin registered: ${pluginName}@${plugin.version}`);
    this.emit('plugin:registered', { name: pluginName, plugin: pluginConfig });
  }

  /**
   * Register hook
   */
  registerHook(hookName, handler, pluginName) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push({
      handler,
      plugin: pluginName,
      order: 0
    });
  }

  /**
   * Execute hook
   */
  async executeHook(hookName, context = {}) {
    const handlers = this.hooks.get(hookName);
    if (!handlers) return context;

    for (const { handler } of handlers) {
      try {
        context = await handler(context);
      } catch (error) {
        console.error(`[PluginSystem] Hook ${hookName} error:`, error.message);
        this.emit('hook:error', { hook: hookName, error });
      }
    }

    return context;
  }

  /**
   * Register code generator
   */
  registerGenerator(generatorName, generator, pluginName) {
    this.generators.set(generatorName, {
      name: generatorName,
      generator,
      plugin: pluginName
    });
  }

  /**
   * Generate code
   */
  async generateCode(generatorName, config) {
    const generator = this.generators.get(generatorName);
    if (!generator) {
      throw new Error(`Code generator not found: ${generatorName}`);
    }

    try {
      const code = await generator.generator(config);
      this.emit('code:generated', { generator: generatorName, config });
      return code;
    } catch (error) {
      console.error(`[PluginSystem] Code generation error:`, error.message);
      throw error;
    }
  }

  /**
   * Get available generators
   */
  getGenerators() {
    return Array.from(this.generators.entries()).map(([name, gen]) => ({
      name,
      plugin: gen.plugin
    }));
  }

  /**
   * Load plugin from file
   */
  async loadPluginFromFile(pluginPath) {
    try {
      const plugin = require(pluginPath);
      const pluginName = plugin.name || pluginPath.split('/').pop();
      this.registerPlugin(pluginName, plugin);
      return pluginName;
    } catch (error) {
      console.error(`[PluginSystem] Failed to load plugin from ${pluginPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Load all plugins from directory
   */
  async loadPluginsFromDirectory(dir = this.config.pluginDir) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const files = await fs.readdir(dir);
      const loadedPlugins = [];

      for (const file of files) {
        if (file.endsWith('.js')) {
          const pluginPath = path.join(dir, file);
          const pluginName = await this.loadPluginFromFile(pluginPath);
          loadedPlugins.push(pluginName);
        }
      }

      console.log(`[PluginSystem] Loaded ${loadedPlugins.length} plugins from ${dir}`);
      return loadedPlugins;
    } catch (error) {
      console.warn(`[PluginSystem] Could not load plugins from ${dir}:`, error.message);
      return [];
    }
  }

  /**
   * Enable hot reload for plugin
   */
  enableHotReload(pluginName, filePath) {
    if (!this.config.enableHotReload) return;

    const fs = require('fs');
    const path = require('path');

    fs.watchFile(filePath, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        console.log(`[PluginSystem] Reloading plugin: ${pluginName}`);
        
        // Clear require cache
        delete require.cache[require.resolve(filePath)];

        try {
          const updatedPlugin = require(filePath);
          this.registerPlugin(pluginName, updatedPlugin);
          this.emit('plugin:reloaded', { name: pluginName });
        } catch (error) {
          console.error(`[PluginSystem] Hot reload failed:`, error.message);
          this.emit('plugin:reload:error', { name: pluginName, error });
        }
      }
    });
  }

  /**
   * Unload plugin
   */
  unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    // Remove hooks
    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => h.plugin !== pluginName);
      this.hooks.set(hookName, filtered);
    }

    // Remove middleware
    this.middleware = this.middleware.filter(m => m.name !== pluginName);

    // Remove validators
    this.validators = this.validators.filter(v => v.name !== pluginName);

    // Remove generators
    for (const [genName, gen] of this.generators.entries()) {
      if (gen.plugin === pluginName) {
        this.generators.delete(genName);
      }
    }

    // Clean up plugin instance
    if (plugin.instance && plugin.instance.destroy) {
      plugin.instance.destroy();
    }

    this.plugins.delete(pluginName);
    this.emit('plugin:unloaded', { name: pluginName });
    console.log(`[PluginSystem] Plugin unloaded: ${pluginName}`);
  }

  /**
   * Get plugin info
   */
  getPluginInfo(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return null;

    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      hooks: Object.keys(plugin.hooks),
      middlewareCount: plugin.middleware.length,
      validatorCount: plugin.validators.length,
      generators: Object.keys(plugin.generators)
    };
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins() {
    const plugins = [];
    for (const [name, plugin] of this.plugins.entries()) {
      plugins.push(this.getPluginInfo(name));
    }
    return plugins;
  }

  /**
   * Execute middleware chain
   */
  async executeMiddleware(req, res, next) {
    if (this.middleware.length === 0) {
      return next();
    }

    let index = 0;

    const executeNext = async () => {
      if (index >= this.middleware.length) {
        return next();
      }

      const { middleware } = this.middleware[index++];
      try {
        await middleware(req, res, executeNext);
      } catch (error) {
        console.error('[PluginSystem] Middleware error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    };

    await executeNext();
  }

  /**
   * Run validators
   */
  async runValidators(data, schema) {
    const errors = [];

    for (const { validator } of this.validators) {
      try {
        const result = await validator(data, schema);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      } catch (error) {
        console.error('[PluginSystem] Validator error:', error.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      pluginCount: this.plugins.size,
      hookCount: this.hooks.size,
      generatorCount: this.generators.size,
      middlewareCount: this.middleware.length,
      validatorCount: this.validators.length,
      plugins: this.getAllPlugins()
    };
  }
}

module.exports = PluginSystem;
