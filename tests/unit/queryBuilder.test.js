const QueryBuilder = require('../../core/queryBuilder');

describe('QueryBuilder', () => {
  it('builds adapter options from chainable query clauses', () => {
    const options = QueryBuilder
      .for('posts')
      .where('status', 'published')
      .where('views', 'gte', 10)
      .search(['title', 'body'], 'easy.js')
      .select('id', 'title')
      .orderBy('createdAt', 'DESC')
      .paginate({ limit: 5, page: 3 })
      .include('author')
      .join('comments', 'id', 'postId')
      .toAdapterOptions();

    expect(options).toEqual({
      filter: {
        status: 'published',
        views: { $gte: 10 }
      },
      fields: ['id', 'title'],
      sort: { createdAt: 'desc' },
      limit: 5,
      skip: 10,
      joins: [{ model: 'comments', localKey: 'id', foreignKey: 'postId', type: 'left' }],
      includes: ['author'],
      search: { fields: ['title', 'body'], term: 'easy.js' }
    });
  });

  it('executes through a database manager using adapter options', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ id: 1 }]) };
    const result = await QueryBuilder
      .for('posts')
      .where('authorId', 'u1')
      .paginate({ offset: 20, limit: 10 })
      .execute(db);

    expect(result).toEqual([{ id: 1 }]);
    expect(db.query).toHaveBeenCalledWith('posts', 'findMany', null, expect.objectContaining({
      filter: { authorId: 'u1' },
      limit: 10,
      skip: 20
    }));
  });

  it('requires a model before execution', async () => {
    await expect(new QueryBuilder().execute({ query: jest.fn() })).rejects.toThrow(
      'QueryBuilder requires a model before execution'
    );
  });
});
