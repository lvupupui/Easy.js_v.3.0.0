const QueryOptimizer = require('../../core/queryOptimizer');

describe('QueryOptimizer', () => {
  it('suggests index types and records optimization profiles', () => {
    const optimizer = new QueryOptimizer();

    const analysis = optimizer.optimizeQuery({
      age: { $gte: 0 },
      status: ['active', 'invited'],
      name: /ada/i
    }, 'users');

    expect(analysis.indexed).toBe(false);
    expect(analysis.suggestions).toContain('Create index on users.age for faster queries');
    expect(optimizer.indexSuggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'age', type: 'range_index' }),
      expect.objectContaining({ field: 'status', type: 'array_index' }),
      expect.objectContaining({ field: 'name', type: 'text_index' })
    ]));
    expect(optimizer.getOptimizationReport().statistics).toEqual(expect.objectContaining({
      totalQueries: 1,
      optimizedQueries: 1
    }));
  });

  it('optimizes compatible batch queries without mutating the original list', () => {
    const optimizer = new QueryOptimizer({ batchSize: 1 });
    const queries = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];

    const analysis = optimizer.optimizeQuery(queries, 'users');

    expect(analysis.batchable).toBe(true);
    expect(analysis.optimized).toEqual({
      bulkOperation: true,
      batchSize: 1,
      queries,
      estimatedTime: 20
    });
    expect(queries).toHaveLength(2);
  });

  it('keeps already optimized non-object queries intact', () => {
    const optimizer = new QueryOptimizer();

    const analysis = optimizer.optimizeQuery('SELECT 1', 'users');

    expect(analysis.optimized).toBe('SELECT 1');
    expect(analysis.suggestions).toEqual(['Query is already optimized']);
  });

  it('reports slow queries and clears profiling state', () => {
    const optimizer = new QueryOptimizer({ slowQueryThreshold: -1 });

    optimizer.optimizeQuery({ id: 1 }, 'users');

    expect(optimizer.getSlowQueries()).toHaveLength(1);
    optimizer.reset();
    expect(optimizer.getOptimizationReport()).toEqual(expect.objectContaining({
      indexSuggestions: [],
      slowQueryList: []
    }));
  });
});
