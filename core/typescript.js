/**
 * TypeScript Support Module
 * Auto-generates TypeScript definitions, types, and interfaces from DSL models
 */

class TypeScriptGenerator {
  constructor(config = {}) {
    this.config = {
      generateTypes: config.generateTypes !== false,
      generateInterfaces: config.generateInterfaces !== false,
      generateEnums: config.generateEnums !== false,
      generateClient: config.generateClient !== false,
      strictMode: config.strictMode !== false,
      includeJSDoc: config.includeJSDoc !== false,
      outputDir: config.outputDir || './types',
      ...config
    };

    this.generatedTypes = new Map();
    this.enums = new Map();
    this.enumDefinitions = new Map();
  }

  /**
   * Generate TypeScript definitions from models
   */
  generateFromModels(models) {
    let typeDefinitions = '';
    this.enums.clear();
    this.enumDefinitions.clear();

    typeDefinitions += this.generateCommonTypes();
    const modelTypes = this.generateModelTypes(models);
    typeDefinitions += this.generateEnumDefinitions();
    typeDefinitions += modelTypes;
    typeDefinitions += this.generateAPITypes(models);

    this.generatedTypes.set('index', typeDefinitions);
    return typeDefinitions;
  }

  /**
   * Generate common types
   */
  generateCommonTypes() {
    return `
// Common Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

export interface QueryOptions {
  select?: string[];
  populate?: string[];
  filter?: Record<string, any>;
  sort?: Record<string, 'asc' | 'desc'>;
  pagination?: PaginationParams;
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
`;
  }

  /**
   * Generate types from models
   */
  generateModelTypes(models) {
    let types = '\n// Model Types\n';

    for (const [modelName, model] of Object.entries(models)) {
      types += this.generateModelType(modelName, model);
    }

    return types;
  }

  /**
   * Generate single model type
   */
  generateModelType(modelName, model) {
    const fields = model.fields || {};
    const singular = this.singularize(modelName);

    let type = `
/**
 * ${modelName} Entity
 */
export interface ${singular} extends BaseEntity {
`;

    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      const normalizedField = this.normalizeFieldConfig(fieldName, fieldConfig);
      const tsType = this.getTypeScriptType(normalizedField);
      const optional = normalizedField.required ? '' : '?';
      const description = normalizedField.description ? `/** ${normalizedField.description} */\n  ` : '';

      type += `  ${description}${fieldName}${optional}: ${tsType};\n`;
    }

    type += `}

export type Create${singular}Input = Omit<${singular}, 'id' | 'createdAt' | 'updatedAt'>;
export type Update${singular}Input = Partial<Create${singular}Input>;

`;

    return type;
  }

  /**
   * Convert JS types to TypeScript types
   */
  getTypeScriptType(fieldConfig) {
    fieldConfig = this.normalizeFieldConfig(fieldConfig.name, fieldConfig);
    const typeMap = {
      string: 'string',
      number: 'number',
      integer: 'number',
      float: 'number',
      boolean: 'boolean',
      date: 'Date',
      object: 'Record<string, any>',
      array: 'any',
      email: 'string',
      url: 'string',
      phone: 'string'
    };

    let type = typeMap[fieldConfig.type] || 'any';

    if (fieldConfig.enum) {
      type = this.generateEnum(fieldConfig.name, fieldConfig.enum);
    }

    if (fieldConfig.isArray) {
      type = `${type}[]`;
    }

    return type;
  }

  /**
   * Generate enum
   */
  generateEnum(enumName, values) {
    const name = `${enumName.charAt(0).toUpperCase()}${enumName.slice(1)}Enum`;

    let enumDef = `\nexport enum ${name} {\n`;
    values.forEach(value => {
      const member = value
        .toString()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^[^a-zA-Z_]/, '_$&')
        .toUpperCase();
      enumDef += `  ${member} = '${value}',\n`;
    });
    enumDef += `}\n`;

    this.enums.set(name, values);
    this.enumDefinitions.set(name, enumDef);
    return name;
  }

  generateEnumDefinitions() {
    if (!this.config.generateEnums) return '';
    return Array.from(this.enumDefinitions.values()).join('\n');
  }

  /**
   * Generate API route types
   */
  generateAPITypes(models) {
    let types = '\n// API Types\n';

    for (const [modelName, model] of Object.entries(models)) {
      const singular = this.singularize(modelName);

      types += `
export namespace ${singular}API {
  export interface GetRequest {
    id: string;
  }
  
  export type GetResponse = APIResponse<${singular}>;
  
  export interface ListRequest extends QueryOptions {}
  
  export type ListResponse = APIResponse<PaginatedResponse<${singular}>>;
  
  export interface CreateRequest {
    body: Create${singular}Input;
  }
  
  export type CreateResponse = APIResponse<${singular}>;
  
  export interface UpdateRequest {
    id: string;
    body: Update${singular}Input;
  }
  
  export type UpdateResponse = APIResponse<${singular}>;
  
  export interface DeleteRequest {
    id: string;
  }
  
  export type DeleteResponse = APIResponse<{ success: boolean }>;
}
`;
    }

    return types;
  }

  /**
   * Generate client SDK
   */
  generateClientSDK(models, apiBaseUrl = 'http://localhost:3000') {
    let client = `
import axios, { AxiosInstance } from 'axios';

export class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '${apiBaseUrl}', token?: string) {
    this.client = axios.create({
      baseURL,
      headers: token ? { Authorization: \`Bearer \${token}\` } : {}
    });
  }

  setToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
  }
`;

    for (const [modelName, model] of Object.entries(models)) {
      const singular = this.singularize(modelName);
      const endpoint = modelName.toLowerCase();

      client += `

  // ${singular} endpoints
  async get${singular}(id: string) {
    return this.client.get<${singular}API.GetResponse>(\`/${endpoint}/\${id}\`);
  }

  async list${modelName}(query?: QueryOptions) {
    return this.client.get<${singular}API.ListResponse>(\`/${endpoint}\`, { params: query });
  }

  async create${singular}(data: Create${singular}Input) {
    return this.client.post<${singular}API.CreateResponse>(\`/${endpoint}\`, data);
  }

  async update${singular}(id: string, data: Update${singular}Input) {
    return this.client.put<${singular}API.UpdateResponse>(\`/${endpoint}/\${id}\`, data);
  }

  async delete${singular}(id: string) {
    return this.client.delete<${singular}API.DeleteResponse>(\`/${endpoint}/\${id}\`);
  }
`;
    }

    client += `
}
`;

    return client;
  }

  /**
   * Generate React hooks
   */
  generateReactHooks(models) {
    let hooks = `
import { useState, useEffect, useCallback } from 'react';
import { APIClient } from './APIClient';

const apiClient = new APIClient();

`;

    for (const [modelName] of Object.entries(models)) {
      const singular = this.singularize(modelName);

      hooks += `
export function use${singular}(id: string) {
  const [data, setData] = useState<${singular} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get${singular}(id)
      .then(res => setData(res.data.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function use${modelName}() {
  const [data, setData] = useState<${singular}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.list${modelName}()
      .then(res => setData(res.data.data?.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function use${singular}Mutation() {
  const create = useCallback(async (data: Create${singular}Input) => {
    return apiClient.create${singular}(data);
  }, []);

  const update = useCallback(async (id: string, data: Update${singular}Input) => {
    return apiClient.update${singular}(id, data);
  }, []);

  const remove = useCallback(async (id: string) => {
    return apiClient.delete${singular}(id);
  }, []);

  return { create, update, remove };
}
`;
    }

    return hooks;
  }

  /**
   * Generate validation schemas
   */
  generateValidationSchemas(models) {
    let schemas = `
// Validation Schemas
`;

    for (const [modelName, model] of Object.entries(models)) {
      const singular = this.singularize(modelName);
      const fields = model.fields || {};

      schemas += `
export const ${singular}Schema = {
`;

      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        const normalizedField = this.normalizeFieldConfig(fieldName, fieldConfig);
        const rules = [];

        if (normalizedField.required) rules.push('required: true');
        if (normalizedField.type === 'email') rules.push('email: true');
        if (normalizedField.type === 'url') rules.push('url: true');
        if (normalizedField.min !== undefined) rules.push(`min: ${normalizedField.min}`);
        if (normalizedField.max !== undefined) rules.push(`max: ${normalizedField.max}`);

        schemas += `  ${fieldName}: { ${rules.join(', ')} },\n`;
      }

      schemas += `};\n`;
    }

    return schemas;
  }

  /**
   * Get all generated types
   */
  getAllTypes() {
    return Array.from(this.generatedTypes.values()).join('\n');
  }

  normalizeFieldConfig(fieldName, fieldConfig) {
    if (typeof fieldConfig === 'string') {
      return { name: fieldName, type: fieldConfig };
    }

    if (Array.isArray(fieldConfig)) {
      return {
        name: fieldName,
        type: fieldConfig[0] || 'any',
        isArray: true
      };
    }

    return {
      name: fieldName,
      type: 'any',
      ...(fieldConfig || {})
    };
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

  /**
   * Export to files
   */
  async exportToFiles(outputDir = this.config.outputDir) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      await fs.mkdir(outputDir, { recursive: true });

      for (const [filename, content] of this.generatedTypes.entries()) {
        const filepath = path.join(outputDir, `${filename}.ts`);
        await fs.writeFile(filepath, content, 'utf-8');
      }

      console.log(`[TypeScriptGenerator] Types exported to ${outputDir}`);
    } catch (error) {
      console.error('[TypeScriptGenerator] Export failed:', error.message);
    }
  }
}

module.exports = TypeScriptGenerator;
