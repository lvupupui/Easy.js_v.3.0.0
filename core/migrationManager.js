const knex = require('knex');
const path = require('path');
const fs = require('fs');
const Logger = require('./logger');

class MigrationManager {
  constructor(config) {
    this.config = config;
    this.knex = null;
  }

  async initialize(environment = 'development') {
    try {
      const knexConfig = require('../knexfile')[environment];
      if (!knexConfig) {
        throw new Error(`Unknown migration environment: ${environment}`);
      }
      this.knex = knex(knexConfig);
      Logger.success(`✓ Migration manager initialized for ${environment}`);
    } catch (error) {
      Logger.error(`Failed to initialize migration manager: ${error.message}`);
      throw error;
    }
  }

  async runMigrations() {
    try {
      const migrations = await this.knex.migrate.latest();
      if (migrations[0]) {
        Logger.success(`✓ Migrations complete. Batch: ${migrations[1]}`);
        migrations[0].forEach(migration => {
          Logger.info(`  ✓ ${migration}`);
        });
      } else {
        Logger.info('✓ Database is up to date');
      }
      return migrations;
    } catch (error) {
      Logger.error(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  async rollbackLastMigration() {
    try {
      const migration = await this.knex.migrate.rollback();
      Logger.success(`✓ Rolled back migration batch`);
      return migration;
    } catch (error) {
      Logger.error(`Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async rollbackAllMigrations() {
    try {
      const migrations = await this.knex.migrate.rollback({}, true);
      Logger.success(`✓ Rolled back all migrations`);
      return migrations;
    } catch (error) {
      Logger.error(`Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async createMigration(name) {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}_${name}.js`;
      const filepath = path.join(__dirname, '../migrations', filename);

      const template = `
exports.up = async (knex) => {
  return knex.schema.createTable('${name}', (table) => {
    table.increments('id').primary();
    // Add columns here
    table.timestamps();
  });
};

exports.down = async (knex) => {
  return knex.schema.dropTable('${name}');
};
`;

      fs.writeFileSync(filepath, template);
      Logger.success(`✓ Migration created: ${filename}`);
      return filepath;
    } catch (error) {
      Logger.error(`Failed to create migration: ${error.message}`);
      throw error;
    }
  }

  async runSeeds() {
    try {
      const seeds = await this.knex.seed.run();
      Logger.success(`✓ Seeds complete`);
      seeds.forEach(seed => {
        Logger.info(`  ✓ ${seed}`);
      });
      return seeds;
    } catch (error) {
      Logger.error(`Seeding failed: ${error.message}`);
      throw error;
    }
  }

  async createSeed(name) {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}_${name}.js`;
      const filepath = path.join(__dirname, '../seeds', filename);

      const template = `
exports.seed = async (knex) => {
  // Delete existing data
  await knex('${name}').del();

  // Insert seed data
  await knex('${name}').insert([
    { id: 1, /* fields */ },
    { id: 2, /* fields */ }
  ]);
};
`;

      fs.writeFileSync(filepath, template);
      Logger.success(`✓ Seed created: ${filename}`);
      return filepath;
    } catch (error) {
      Logger.error(`Failed to create seed: ${error.message}`);
      throw error;
    }
  }

  async getMigrationStatus() {
    try {
      const completed = await this.knex.migrate.list();
      Logger.info(`✓ Migration status retrieved`);
      return {
        completed: completed[0],
        pending: completed[1]
      };
    } catch (error) {
      Logger.error(`Failed to get migration status: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.knex) {
      await this.knex.destroy();
      Logger.info('✓ Migration manager closed');
    }
  }
}

module.exports = MigrationManager;
