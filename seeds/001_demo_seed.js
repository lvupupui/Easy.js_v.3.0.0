exports.seed = async (knex) => {
  await knex('users').del();
  await knex('users').insert([
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: '$2a$10$example-hash-replace-in-real-seeds',
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};
