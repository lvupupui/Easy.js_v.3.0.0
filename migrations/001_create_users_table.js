exports.up = async (knex) => {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('name').notNullable();
    table.string('phone').nullable();
    table.string('avatar_url').nullable();
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.boolean('verified').defaultTo(false);
    table.boolean('active').defaultTo(true);
    table.timestamp('email_verified_at').nullable();
    table.timestamp('last_login').nullable();
    table.timestamps();
    table.index('email');
    table.index('role');
  });
};

exports.down = async (knex) => {
  return knex.schema.dropTable('users');
};
