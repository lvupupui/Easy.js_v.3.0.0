class OptionalPackageAdapter {
  static for(databaseName, packageName) {
    return class MissingOptionalDatabaseAdapter extends OptionalPackageAdapter {
      constructor() {
        super(databaseName, packageName);
      }
    };
  }

  constructor(databaseName, packageName) {
    this.databaseName = databaseName;
    this.packageName = packageName;
  }

  async connect() {
    try {
      require.resolve(this.packageName);
    } catch {
      throw new Error(
        `${this.databaseName} support is registered but requires the optional package "${this.packageName}". ` +
        `Install it and provide a production adapter configuration before using this database.`
      );
    }

    throw new Error(
      `${this.databaseName} requires a provider-specific adapter implementation. ` +
      `The framework registry is ready, but this adapter is intentionally gated behind "${this.packageName}".`
    );
  }
}

module.exports = OptionalPackageAdapter;
