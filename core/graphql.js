/**
 * GraphQL Integration Module
 * Automatic GraphQL schema generation, resolvers, and subscriptions
 */

class GraphQLModule {
  constructor(config = {}) {
    this.config = {
      enableGraphQL: config.enableGraphQL !== false,
      enableSubscriptions: config.enableSubscriptions !== false,
      enableBatching: config.enableBatching !== false,
      autoGenerateSchema: config.autoGenerateSchema !== false,
      introspectionEnabled: config.introspectionEnabled !== false,
      ...config
    };

    this.schema = null;
    this.resolvers = {};
    this.subscriptions = new Map();
    this.sdl = '';
  }

  /**
   * Generate GraphQL schema from models
   */
  generateSchema(models) {
    let schemaDefinition = '';

    // Generate types from models
    for (const [modelName, model] of Object.entries(models)) {
      schemaDefinition += this.generateTypeDefinition(modelName, model);
    }

    // Add Query type
    schemaDefinition += this.generateQueryType(models);

    // Add Mutation type
    schemaDefinition += this.generateMutationType(models);

    // Add Subscription type if enabled
    if (this.config.enableSubscriptions) {
      schemaDefinition += this.generateSubscriptionType(models);
    }

    this.sdl = schemaDefinition;
    return schemaDefinition;
  }

  /**
   * Generate GraphQL type definition from model
   */
  generateTypeDefinition(modelName, model) {
    const fields = model.fields || {};
    let typeDef = `\ntype ${modelName} {\n`;
    typeDef += `  id: ID!\n`;

    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      const normalizedField = this.normalizeFieldConfig(fieldConfig);
      const graphqlType = this.getGraphQLType(normalizedField.type, normalizedField.isArray);
      const required = normalizedField.required ? '!' : '';
      typeDef += `  ${fieldName}: ${graphqlType}${required}\n`;
    }

    typeDef += `  createdAt: DateTime!\n`;
    typeDef += `  updatedAt: DateTime!\n`;
    typeDef += `}\n`;

    return typeDef;
  }

  /**
   * Convert JavaScript type to GraphQL type
   */
  getGraphQLType(jsType, isArray = false) {
    const typeMap = {
      string: 'String',
      number: 'Int',
      float: 'Float',
      boolean: 'Boolean',
      date: 'DateTime',
      object: 'JSON',
      array: 'String'
    };

    const type = typeMap[jsType] || 'String';
    return isArray || jsType === 'array' ? `[${type}]` : type;
  }

  /**
   * Generate Query type
   */
  generateQueryType(models) {
    let query = `\ntype Query {\n`;

    for (const [modelName] of Object.entries(models)) {
      const singular = this.singularize(modelName);
      const plural = modelName;

      query += `  ${singular}(id: ID!): ${modelName}\n`;
      query += `  ${plural}(limit: Int, offset: Int, filter: String): [${modelName}]!\n`;
      query += `  ${plural}Count: Int!\n`;
    }

    query += `}\n`;
    return query;
  }

  /**
   * Generate Mutation type
   */
  generateMutationType(models) {
    let mutation = `\ntype Mutation {\n`;

    for (const modelName of Object.keys(models)) {
      const singular = this.singularize(modelName);
      const createInput = `${singular}Input`;
      const updateInput = `${singular}UpdateInput`;

      mutation += `  create${singular}(input: ${createInput}!): ${modelName}!\n`;
      mutation += `  update${singular}(id: ID!, input: ${updateInput}!): ${modelName}!\n`;
      mutation += `  delete${singular}(id: ID!): Boolean!\n`;
      mutation += `  bulkCreate${modelName}(inputs: [${createInput}!]!): [${modelName}]!\n`;
    }

    mutation += `}\n`;
    return mutation;
  }

  /**
   * Generate Subscription type
   */
  generateSubscriptionType(models) {
    let subscription = `\ntype Subscription {\n`;

    for (const modelName of Object.keys(models)) {
      const singular = this.singularize(modelName);

      subscription += `  ${singular}Created: ${modelName}!\n`;
      subscription += `  ${singular}Updated(id: ID!): ${modelName}!\n`;
      subscription += `  ${singular}Deleted(id: ID!): ID!\n`;
    }

    subscription += `}\n`;
    return subscription;
  }

  /**
   * Create resolvers from database
   */
  createResolvers(db) {
    const resolvers = {
      Query: {},
      Mutation: {},
      Subscription: {}
    };

    // Generate Query resolvers
    for (const [modelName] of Object.entries(db.models || {})) {
      const singular = this.singularize(modelName);

      resolvers.Query[singular] = async (_, { id }) => {
        return db.findById(modelName, id);
      };

      resolvers.Query[modelName] = async (_, { limit, offset, filter }) => {
        const query = filter ? JSON.parse(filter) : {};
        return db.find(modelName, query, { limit, offset });
      };

      resolvers.Query[`${modelName}Count`] = async () => {
        return db.count(modelName);
      };
    }

    // Generate Mutation resolvers
    for (const modelName of Object.keys(db.models || {})) {
      const singular = this.singularize(modelName);

      resolvers.Mutation[`create${singular}`] = async (_, { input }) => {
        const result = await db.create(modelName, input);
        this.publishSubscription(`${singular}Created`, result);
        return result;
      };

      resolvers.Mutation[`update${singular}`] = async (_, { id, input }) => {
        const result = await db.update(modelName, id, input);
        this.publishSubscription(`${singular}Updated`, result);
        return result;
      };

      resolvers.Mutation[`delete${singular}`] = async (_, { id }) => {
        const success = await db.delete(modelName, id);
        if (success) {
          this.publishSubscription(`${singular}Deleted`, id);
        }
        return success;
      };

      resolvers.Mutation[`bulkCreate${modelName}`] = async (_, { inputs }) => {
        const results = await db.bulkCreate(modelName, inputs);
        results.forEach(result => {
          this.publishSubscription(`${singular}Created`, result);
        });
        return results;
      };
    }

    this.resolvers = resolvers;
    return resolvers;
  }

  /**
   * Create subscription
   */
  subscribe(subscriptionId, subscriptionName, callback) {
    if (!this.subscriptions.has(subscriptionName)) {
      this.subscriptions.set(subscriptionName, []);
    }

    this.subscriptions.get(subscriptionName).push({
      id: subscriptionId,
      callback
    });

    return () => {
      // Unsubscribe
      const subs = this.subscriptions.get(subscriptionName);
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
      }
    };
  }

  /**
   * Publish subscription event
   */
  publishSubscription(subscriptionName, data) {
    const subscribers = this.subscriptions.get(subscriptionName);
    if (subscribers) {
      subscribers.forEach(sub => {
        try {
          sub.callback(data);
        } catch (error) {
          console.error('[GraphQL] Subscription callback error:', error.message);
        }
      });
    }
  }

  /**
   * Execute GraphQL query
   */
  async executeQuery(query, variables = {}, context = {}) {
    // Simple query parser - in production, use actual GraphQL engine like apollo-server
    try {
      // This is a simplified implementation
      // In production, use: const result = await graphql(schema, query, rootValue, context, variables)
      return {
        data: null,
        errors: ['GraphQL execution requires apollo-server setup']
      };
    } catch (error) {
      return {
        data: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Get schema as SDL
   */
  getSchema() {
    return this.sdl;
  }

  /**
   * Setup GraphQL middleware for Express
   */
  getExpressMiddleware() {
    return (req, res, next) => {
      if (req.path === '/graphql') {
        const { query, variables } = req.body;

        this.executeQuery(query, variables, { user: req.user })
          .then(result => res.json(result))
          .catch(error => res.status(400).json({ errors: [error.message] }));
      } else {
        next();
      }
    };
  }

  /**
   * Get GraphQL Playground HTML
   */
  getPlaygroundHTML() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Playground</title>
          <meta charset=utf-8/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css"/>
        </head>
        <body>
          <div id="root"></div>
          <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/umd/graphql-playground.js"></script>
          <script>
            window.addEventListener('load', function (event) {
              GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/graphql'
              })
            })
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Validate GraphQL query
   */
  validateQuery(query) {
    const errors = [];

    if (!query) {
      errors.push('Query cannot be empty');
    }

    if (query && query.includes('__schema')) {
      if (!this.config.introspectionEnabled) {
        errors.push('Introspection is disabled');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get schema introspection data
   */
  getIntrospection() {
    if (!this.config.introspectionEnabled) {
      throw new Error('Introspection is disabled');
    }

    return {
      schema: this.sdl,
      resolvers: Object.keys(this.resolvers),
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }

  normalizeFieldConfig(fieldConfig) {
    if (typeof fieldConfig === 'string') {
      return { type: fieldConfig };
    }

    if (Array.isArray(fieldConfig)) {
      return { type: fieldConfig[0] || 'string', isArray: true };
    }

    return fieldConfig || { type: 'string' };
  }

  singularize(modelName) {
    if (modelName.endsWith('ies')) {
      return `${modelName.slice(0, -3)}y`;
    }
    if (modelName.endsWith('ses')) {
      return modelName.slice(0, -2);
    }
    if (modelName.endsWith('s')) {
      return modelName.slice(0, -1);
    }
    return modelName;
  }
}

module.exports = GraphQLModule;
