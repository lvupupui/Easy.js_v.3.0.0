const EventEmitter = require('events');

class ServiceRegistry extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.handlers = new Map();
  }

  register(name, instance) {
    const service = {
      name,
      url: instance.url,
      metadata: instance.metadata || {},
      status: instance.status || 'healthy',
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };
    this.services.set(name, service);
    this.emit('registered', service);
    return service;
  }

  heartbeat(name, status = 'healthy') {
    const service = this.services.get(name);
    if (!service) return false;
    service.status = status;
    service.lastHeartbeat = new Date().toISOString();
    return true;
  }

  discover(name) {
    return this.services.get(name) || null;
  }

  list() {
    return Array.from(this.services.values());
  }

  onCommand(command, handler) {
    this.handlers.set(command, handler);
    return this;
  }

  async send(command, payload = {}) {
    const handler = this.handlers.get(command);
    if (!handler) {
      throw new Error(`No handler registered for command: ${command}`);
    }
    return handler(payload);
  }

  createSaga(steps = []) {
    return async (context = {}) => {
      const completed = [];
      try {
        for (const step of steps) {
          const result = await step.action(context);
          completed.push({ step, result });
        }
        return { success: true, context, completed: completed.length };
      } catch (error) {
        for (const item of completed.reverse()) {
          if (item.step.compensate) {
            await item.step.compensate(context, item.result);
          }
        }
        throw error;
      }
    };
  }
}

module.exports = ServiceRegistry;
