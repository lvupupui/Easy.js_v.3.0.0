/**
 * Query Optimization Engine
 * Analyzes and optimizes database queries for performance
 * Includes query planning, index suggestions, and execution analysis
 */

class QueryOptimizer {
  constructor(config = {}) {
    this.config = {
      enableProfiling: config.enableProfiling !== false,
      slowQueryThreshold: config.slowQueryThreshold || 100, // ms
      analyzeIndexes: config.analyzeIndexes !== false,
      enableAutoJoin: config.enableAutoJoin !== false,
      batchSize: config.batchSize || 1000,
      ...config
    };

    this.queryProfiles = new Map();
    this.indexSuggestions = [];
    this.executionStats = {
      total: 0,
      slow: 0,
      optimized: 0,
      avgExecutionTime: 0
    };
  }

  /**
   * Analyze and optimize query execution
   */
  optimizeQuery(query, model) {
    const startTime = Date.now();
    const analysis = {
      original: query,
      optimized: query,
      suggestions: [],
      estimatedTime: 0,
      indexed: false,
      batchable: false
    };

    // Analyze query structure
    if (typeof query === 'object') {
      analysis.suggestions.push(...this.suggestIndexes(query, model));
      analysis.indexed = this.hasOptimalIndexes(query, model);
      analysis.batchable = this.isBatchOptimizable(query);
      analysis.estimatedTime = this.estimateExecutionTime(query, model);
    }

    // Apply optimizations
    if (analysis.batchable && Array.isArray(query)) {
      analysis.optimized = this.optimizeBatchQuery(query);
      analysis.suggestions.push('Batch query optimization applied');
    }

    if (analysis.suggestions.length === 0) {
      analysis.suggestions.push('Query is already optimized');
    }

    this.recordQueryProfile(query, analysis, startTime);
    return analysis;
  }

  /**
   * Suggest indexes for better query performance
   */
  suggestIndexes(query, model) {
    const suggestions = [];
    const fields = Object.keys(query);

    fields.forEach(field => {
      if (!this.isFieldIndexed(model, field)) {
        suggestions.push(`Create index on ${model}.${field} for faster queries`);
        this.indexSuggestions.push({
          model,
          field,
          type: this.determineIndexType(query[field]),
          priority: 'high',
          estimatedSpeedup: '2-5x'
        });
      }
    });

    return suggestions;
  }

  /**
   * Determine optimal index type based on query pattern
   */
  determineIndexType(value) {
    if (Array.isArray(value)) return 'array_index';
    if (value instanceof RegExp) return 'text_index';
    if (
      value &&
      typeof value === 'object' &&
      (Object.prototype.hasOwnProperty.call(value, '$gt') ||
        Object.prototype.hasOwnProperty.call(value, '$gte') ||
        Object.prototype.hasOwnProperty.call(value, '$lt') ||
        Object.prototype.hasOwnProperty.call(value, '$lte'))
    ) {
      return 'range_index';
    }
    return 'single_field_index';
  }

  /**
   * Check if field is already indexed
   */
  isFieldIndexed(model, field) {
    // This would connect to actual database metadata
    // For now, return false to suggest indexing
    return false;
  }

  /**
   * Check if query has optimal indexes
   */
  hasOptimalIndexes(query, model) {
    const fields = Object.keys(query);
    return fields.every(f => this.isFieldIndexed(model, f));
  }

  /**
   * Check if query can be optimized for batching
   */
  isBatchOptimizable(query) {
    if (!Array.isArray(query)) return false;
    if (query.length < 2) return false;
    // Check if all items have similar structure
    const firstKeys = Object.keys(query[0]).sort();
    return query.slice(1).every(q => 
      Object.keys(q).sort().join() === firstKeys.join()
    );
  }

  /**
   * Optimize batch queries for bulk operations
   */
  optimizeBatchQuery(queries) {
    const optimized = {
      bulkOperation: true,
      batchSize: Math.min(this.config.batchSize, queries.length),
      queries: queries,
      estimatedTime: queries.length * 10 // rough estimate
    };
    return optimized;
  }

  /**
   * Estimate query execution time
   */
  estimateExecutionTime(query, model) {
    let baseTime = 5; // base milliseconds

    // Add time for complexity
    const fieldCount = query && typeof query === 'object' ? Object.keys(query).length : 1;
    baseTime += fieldCount * 2;

    // Add time for potential joins
    if (this.config.enableAutoJoin && this.needsJoin(query, model)) {
      baseTime += 15;
    }

    // Add time for sorting/filtering
    if (query.$sort) baseTime += 10;
    if (query.$limit) baseTime += 5;

    return baseTime;
  }

  /**
   * Check if query needs join optimization
   */
  needsJoin(query, model) {
    return Object.keys(query).some(key => 
      key.includes('_id') || key.includes('ref')
    );
  }

  /**
   * Record query performance profile
   */
  recordQueryProfile(query, analysis, startTime) {
    const executionTime = Date.now() - startTime;
    const key = JSON.stringify(query);

    if (!this.queryProfiles.has(key)) {
      this.queryProfiles.set(key, {
        executions: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        isSlow: false
      });
    }

    const profile = this.queryProfiles.get(key);
    profile.executions++;
    profile.totalTime += executionTime;
    profile.minTime = Math.min(profile.minTime, executionTime);
    profile.maxTime = Math.max(profile.maxTime, executionTime);
    profile.isSlow = executionTime > this.config.slowQueryThreshold;

    // Update statistics
    this.executionStats.total++;
    if (profile.isSlow) this.executionStats.slow++;
    if (analysis.suggestions.length > 0) this.executionStats.optimized++;
    this.executionStats.avgExecutionTime = 
      (this.executionStats.avgExecutionTime * (this.executionStats.total - 1) + executionTime) / 
      this.executionStats.total;
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(limit = 10) {
    const slow = Array.from(this.queryProfiles.entries())
      .filter(([_, profile]) => profile.isSlow)
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, limit)
      .map(([query, profile]) => ({
        query: JSON.parse(query),
        executions: profile.executions,
        avgTime: (profile.totalTime / profile.executions).toFixed(2),
        maxTime: profile.maxTime,
        minTime: profile.minTime
      }));

    return slow;
  }

  /**
   * Get optimization report
   */
  getOptimizationReport() {
    return {
      statistics: {
        totalQueries: this.executionStats.total,
        slowQueries: this.executionStats.slow,
        optimizedQueries: this.executionStats.optimized,
        avgExecutionTime: this.executionStats.avgExecutionTime.toFixed(2) + 'ms'
      },
      indexSuggestions: this.indexSuggestions.slice(0, 20),
      slowQueryList: this.getSlowQueries(10),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.executionStats.slow > this.executionStats.total * 0.1) {
      recommendations.push('More than 10% of queries are slow. Consider adding indexes.');
    }

    if (this.indexSuggestions.length > 0) {
      recommendations.push(`${this.indexSuggestions.length} index recommendations available.`);
    }

    if (this.executionStats.avgExecutionTime > 50) {
      recommendations.push('Average execution time is above 50ms. Review slow query log.');
    }

    return recommendations;
  }

  /**
   * Reset profiling data
   */
  reset() {
    this.queryProfiles.clear();
    this.indexSuggestions = [];
    this.executionStats = {
      total: 0,
      slow: 0,
      optimized: 0,
      avgExecutionTime: 0
    };
  }
}

module.exports = QueryOptimizer;
