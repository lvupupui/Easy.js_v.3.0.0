const { DynamoDBClient, CreateTableCommand, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const Logger = require('../core/logger');

class DynamoDBAdapter {
  constructor() {
    this.dynamodb = null;
    this.documentClient = null;
    this.connected = false;
  }

  async connect(config, models = []) {
    try {
      const clientConfig = {
        region: config.region || process.env.AWS_REGION || 'us-east-1'
      };

      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint;
      }

      if (config.accessKeyId && config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        };
      }

      this.dynamodb = new DynamoDBClient(clientConfig);
      this.documentClient = DynamoDBDocumentClient.from(this.dynamodb, {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
      this.connected = true;
      Logger.success('DynamoDB connected');

      for (const model of models) {
        await this.createTable(model);
      }
    } catch (error) {
      Logger.error('DynamoDB connection error: ' + error.message);
      throw error;
    }
  }

  async createTable(model) {
    const modelName = typeof model === 'string' ? model : model.name;
    const params = {
      TableName: modelName,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    try {
      await this.dynamodb.send(new CreateTableCommand(params));
      await waitUntilTableExists(
        { client: this.dynamodb, maxWaitTime: 30 },
        { TableName: modelName }
      );
      Logger.info(`Table created: ${modelName}`);
    } catch (error) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
      Logger.info(`Table exists: ${modelName}`);
    }
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('DynamoDB not connected');

    switch (operation) {
      case 'findOne':
        return this.findOne(model, data);
      case 'findMany':
        return this.findMany(model, data, options);
      case 'create':
        return this.create(model, data);
      case 'update':
        return this.update(model, data);
      case 'delete':
        return this.delete(model, data);
      case 'count':
        return this.count(model, data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async findOne(model, query) {
    const [key, value] = Object.entries(query || {})[0] || [];
    if (!key) return null;

    if (key === 'id') {
      const result = await this.documentClient.send(new GetCommand({
        TableName: model,
        Key: { id: value }
      }));
      return result.Item || null;
    }

    const result = await this.documentClient.send(new QueryCommand({
      TableName: model,
      IndexName: `${key}-index`,
      KeyConditionExpression: '#key = :val',
      ExpressionAttributeNames: { '#key': key },
      ExpressionAttributeValues: { ':val': value },
      Limit: 1
    }));

    return result.Items[0] || null;
  }

  async findMany(model, query = {}, options = {}) {
    const params = {
      TableName: model
    };

    if (Object.keys(query).length > 0) {
      const [key, value] = Object.entries(query)[0];
      params.FilterExpression = '#key = :val';
      params.ExpressionAttributeNames = { '#key': key };
      params.ExpressionAttributeValues = { ':val': value };
    }

    if (options.limit) params.Limit = options.limit;

    const result = await this.documentClient.send(new ScanCommand(params));
    return result.Items || [];
  }

  async create(model, data) {
    const item = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.documentClient.send(new PutCommand({
      TableName: model,
      Item: item
    }));

    return item;
  }

  async update(model, data) {
    const { id, ...updateData } = data;
    if (!id) throw new Error('DynamoDB update requires an id');

    const expressionAttributeNames = {};
    const expressionAttributeValues = { ':now': new Date().toISOString() };
    const fields = Object.entries(updateData).map(([key, value], i) => {
      expressionAttributeNames[`#field${i}`] = key;
      expressionAttributeValues[`:val${i}`] = value;
      return `#field${i} = :val${i}`;
    });

    fields.push('updated_at = :now');

    await this.documentClient.send(new UpdateCommand({
      TableName: model,
      Key: { id },
      UpdateExpression: `SET ${fields.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    return { id, ...updateData, updated_at: expressionAttributeValues[':now'] };
  }

  async delete(model, query) {
    const [key, value] = Object.entries(query || {})[0] || [];
    if (!key) return { deleted: 0 };

    const items = key === 'id'
      ? [await this.findOne(model, { id: value })].filter(Boolean)
      : await this.findMany(model, { [key]: value });

    for (const item of items) {
      await this.documentClient.send(new DeleteCommand({
        TableName: model,
        Key: { id: item.id }
      }));
    }

    return { deleted: items.length };
  }

  async count(model, query = {}) {
    const params = {
      TableName: model,
      Select: 'COUNT'
    };

    if (Object.keys(query).length > 0) {
      const [key, value] = Object.entries(query)[0];
      params.FilterExpression = '#key = :val';
      params.ExpressionAttributeNames = { '#key': key };
      params.ExpressionAttributeValues = { ':val': value };
    }

    const result = await this.documentClient.send(new ScanCommand(params));
    return result.Count || 0;
  }

  async healthCheck() {
    if (!this.connected) return { status: 'disconnected' };
    return { status: 'connected' };
  }

  async close() {
    if (this.dynamodb) this.dynamodb.destroy();
    this.connected = false;
  }
}

module.exports = DynamoDBAdapter;
