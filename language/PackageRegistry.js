class EasyPackageRegistry {
  constructor() {
    this.packages = new Map();
  }

  register(name, module) {
    this.packages.set(name, {
      name,
      module,
      registeredAt: new Date().toISOString()
    });
    return this;
  }

  resolve(name) {
    return this.packages.get(name)?.module || null;
  }

  list() {
    return Array.from(this.packages.values()).map(pkg => ({
      name: pkg.name,
      registeredAt: pkg.registeredAt
    }));
  }
}

module.exports = EasyPackageRegistry;
