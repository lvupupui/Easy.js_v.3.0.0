const GraphQLModule = require('../../core/graphql');

describe('GraphQLModule', () => {
  const models = {
    categories: {
      fields: {
        name: { type: 'string', required: true },
        email: 'email',
        scores: ['number'],
        metadata: { type: 'object' }
      }
    }
  };

  it('generates SDL for models, queries, mutations, and subscriptions', () => {
    const graphql = new GraphQLModule();

    const sdl = graphql.generateSchema(models);

    expect(sdl).toContain('type categories');
    expect(sdl).toContain('name: String!');
    expect(sdl).toContain('email: String');
    expect(sdl).toContain('scores: [Int]');
    expect(sdl).toContain('metadata: JSON');
    expect(sdl).toContain('category(id: ID!): categories');
    expect(sdl).toContain('createcategory(input: categoryInput!): categories!');
    expect(sdl).toContain('categoryCreated: categories!');
    expect(graphql.getSchema()).toBe(sdl);
  });

  it('creates resolvers that delegate to database operations and publish events', async () => {
    const graphql = new GraphQLModule();
    const callback = jest.fn();
    graphql.subscribe('sub-1', 'categoryCreated', callback);

    const db = {
      models,
      findById: jest.fn().mockResolvedValue({ id: '1' }),
      find: jest.fn().mockResolvedValue([{ id: '1' }]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue({ id: '2' }),
      update: jest.fn().mockResolvedValue({ id: '2', name: 'Updated' }),
      delete: jest.fn().mockResolvedValue(true),
      bulkCreate: jest.fn().mockResolvedValue([{ id: '3' }])
    };

    const resolvers = graphql.createResolvers(db);

    await expect(resolvers.Query.category(null, { id: '1' })).resolves.toEqual({ id: '1' });
    await expect(resolvers.Query.categories(null, {
      limit: 10,
      offset: 5,
      filter: '{"active":true}'
    })).resolves.toEqual([{ id: '1' }]);
    await expect(resolvers.Query.categoriesCount()).resolves.toBe(1);
    await expect(resolvers.Mutation.createcategory(null, { input: { name: 'New' } })).resolves.toEqual({ id: '2' });
    await expect(resolvers.Mutation.updatecategory(null, { id: '2', input: { name: 'Updated' } })).resolves.toEqual({
      id: '2',
      name: 'Updated'
    });
    await expect(resolvers.Mutation.deletecategory(null, { id: '2' })).resolves.toBe(true);
    await expect(resolvers.Mutation.bulkCreatecategories(null, { inputs: [{ name: 'Bulk' }] })).resolves.toEqual([{ id: '3' }]);

    expect(db.find).toHaveBeenCalledWith('categories', { active: true }, { limit: 10, offset: 5 });
    expect(callback).toHaveBeenCalledWith({ id: '2' });
  });

  it('supports unsubscribe and isolates failing subscription callbacks', () => {
    const graphql = new GraphQLModule();
    const callback = jest.fn();
    const unsubscribe = graphql.subscribe('sub-1', 'categoryCreated', callback);
    graphql.subscribe('sub-2', 'categoryCreated', () => {
      throw new Error('boom');
    });

    graphql.publishSubscription('categoryCreated', { id: '1' });
    unsubscribe();
    graphql.publishSubscription('categoryCreated', { id: '2' });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('validates queries, middleware routing, execution fallback, and introspection', async () => {
    const graphql = new GraphQLModule({ introspectionEnabled: false });

    expect(graphql.validateQuery('')).toEqual({ valid: false, errors: ['Query cannot be empty'] });
    expect(graphql.validateQuery('{ __schema { types { name } } }')).toEqual({
      valid: false,
      errors: ['Introspection is disabled']
    });
    await expect(graphql.executeQuery('{ ping }')).resolves.toEqual({
      data: null,
      errors: ['GraphQL execution requires apollo-server setup']
    });
    expect(() => graphql.getIntrospection()).toThrow('Introspection is disabled');

    const middleware = graphql.getExpressMiddleware();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const next = jest.fn();

    await middleware({ path: '/graphql', body: { query: '{ ping }' }, user: { id: 1 } }, { json, status }, next);
    middleware({ path: '/health', body: {} }, { json, status }, next);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
    expect(next).toHaveBeenCalled();
    expect(graphql.getPlaygroundHTML()).toContain('GraphQLPlayground.init');
  });
});
