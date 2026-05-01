const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

class SwaggerGenerator {
  static generate(appName = 'easy.js', version = '1.0.0', models = []) {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: appName,
          version: version,
          description: `API Documentation for ${appName}`,
          contact: {
            name: 'API Support',
            email: 'support@example.com'
          }
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server'
          },
          {
            url: 'https://api.example.com',
            description: 'Production server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          },
          schemas: SwaggerGenerator.generateSchemas(models)
        },
        paths: SwaggerGenerator.generatePaths(models),
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: ['./routes/**/*.js', './middleware/**/*.js']
    };

    return swaggerJsdoc(options);
  }

  static generateSchemas(models) {
    const schemas = {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              statusCode: { type: 'integer' }
            }
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' }
        }
      }
    };

    models.forEach(model => {
      const properties = {};
      properties.id = { type: 'integer', description: 'Unique identifier' };

      if (model.fields) {
        Object.entries(model.fields).forEach(([key, type]) => {
          properties[key] = SwaggerGenerator.getPropertyType(type);
        });
      }

      properties.created_at = { type: 'string', format: 'date-time' };
      properties.updated_at = { type: 'string', format: 'date-time' };

      schemas[model.name] = {
        type: 'object',
        properties,
        required: ['id']
      };
    });

    return schemas;
  }

  static generatePaths(models) {
    const paths = {};

    models.forEach(model => {
      const modelName = model.name.toLowerCase();
      const path = `/api/${modelName}`;

      // List
      paths[path] = {
        get: {
          summary: `Get all ${modelName}`,
          tags: [model.name],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } }
          ],
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: `#/components/schemas/${model.name}` } },
                      pagination: {
                        type: 'object',
                        properties: {
                          limit: { type: 'integer' },
                          skip: { type: 'integer' },
                          total: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: `Create new ${modelName}`,
          tags: [model.name],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${model.name}` }
              }
            }
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${model.name}` }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
          }
        }
      };

      // Detail
      paths[`${path}/{id}`] = {
        get: {
          summary: `Get ${modelName} by ID`,
          tags: [model.name],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${model.name}` }
                }
              }
            },
            404: {
              description: 'Not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
          }
        },
        put: {
          summary: `Update ${modelName}`,
          tags: [model.name],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${model.name}` }
              }
            }
          },
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${model.name}` }
                }
              }
            }
          }
        },
        delete: {
          summary: `Delete ${modelName}`,
          tags: [model.name],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Deleted successfully' },
            404: {
              description: 'Not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
          }
        }
      };
    });

    // Health check
    paths['/health'] = {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        security: [],
        responses: {
          200: { description: 'Server is healthy' }
        }
      }
    };

    return paths;
  }

  static getPropertyType(type) {
    const typeMap = {
      string: { type: 'string' },
      number: { type: 'number' },
      integer: { type: 'integer' },
      boolean: { type: 'boolean' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      text: { type: 'string' },
      json: { type: 'object' },
      uuid: { type: 'string', format: 'uuid' }
    };

    return typeMap[type] || { type: 'string' };
  }

  static setupSwagger(app, models = []) {
    const specs = this.generate('easy.js API', '1.0.0', models);
    
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(specs, {
      swaggerOptions: {
        tryItOutEnabled: true,
        withCredentials: true
      }
    }));

    return specs;
  }
}

module.exports = SwaggerGenerator;
