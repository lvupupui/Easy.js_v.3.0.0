const CANONICAL_OPERATIONS = {
  findall: 'findMany',
  findmany: 'findMany',
  list: 'findMany',
  findbyid: 'findOne',
  findone: 'findOne',
  get: 'findOne',
  create: 'create',
  insert: 'create',
  updatebyid: 'update',
  update: 'update',
  deletebyid: 'delete',
  delete: 'delete',
  remove: 'delete',
  count: 'count',
  search: 'search'
};

function normalizeOperation(operation) {
  const key = String(operation || '').replace(/[_\s-]/g, '').toLowerCase();
  return CANONICAL_OPERATIONS[key] || operation;
}

function normalizeModel(model) {
  if (!model) return model;
  const schema = model.schema || model.fields || {};
  return {
    ...model,
    schema,
    fields: Object.fromEntries(
      Object.entries(schema).map(([key, value]) => [key, normalizeFieldType(value)])
    )
  };
}

function normalizeModels(models = []) {
  return models.map(normalizeModel);
}

function normalizeQueryInput(operation, data, options = {}) {
  const normalized = normalizeOperation(operation);

  if (normalized === 'findMany') {
    return {
      operation: normalized,
      data: options.filter || data || {},
      options
    };
  }

  if (normalized === 'findOne') {
    if (data && typeof data === 'object') {
      return { operation: normalized, data, options };
    }
    return { operation: normalized, data: { id: data }, options };
  }

  if (normalized === 'update') {
    if (data && data.updates) {
      return {
        operation: normalized,
        data: { id: data.id, ...data.updates },
        options
      };
    }
    return { operation: normalized, data, options };
  }

  if (normalized === 'delete') {
    if (data && typeof data === 'object') {
      return { operation: normalized, data, options };
    }
    return { operation: normalized, data: { id: data }, options };
  }

  return { operation: normalized, data, options };
}

function normalizeFieldType(field) {
  if (typeof field === 'string') return field.toLowerCase();
  if (field && field.type) {
    if (typeof field.type === 'string') return field.type.toLowerCase();
    if (field.type.name) return field.type.name.toLowerCase();
  }
  return 'string';
}

function assertIdentifier(identifier, label = 'identifier') {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(identifier || ''))) {
    throw new Error(`Invalid ${label}: ${identifier}`);
  }
  return identifier;
}

function quoteIdentifier(identifier, quote = '"') {
  assertIdentifier(identifier);
  return `${quote}${identifier}${quote}`;
}

function toSqlType(type, dialect = 'postgres') {
  const normalized = normalizeFieldType(type);
  const common = {
    string: dialect === 'postgres' ? 'VARCHAR(255)' : 'VARCHAR(255)',
    email: 'VARCHAR(255)',
    phone: 'VARCHAR(32)',
    text: 'TEXT',
    number: dialect === 'postgres' ? 'NUMERIC' : 'INTEGER',
    integer: 'INTEGER',
    float: dialect === 'postgres' ? 'DOUBLE PRECISION' : 'REAL',
    boolean: 'BOOLEAN',
    date: dialect === 'postgres' ? 'TIMESTAMP' : 'DATETIME',
    uuid: dialect === 'postgres' ? 'UUID' : 'VARCHAR(36)',
    json: dialect === 'postgres' ? 'JSONB' : 'JSON',
    object: dialect === 'postgres' ? 'JSONB' : 'JSON',
    array: dialect === 'postgres' ? 'JSONB' : 'JSON'
  };
  return common[normalized] || common.string;
}

module.exports = {
  assertIdentifier,
  normalizeFieldType,
  normalizeModel,
  normalizeModels,
  normalizeOperation,
  normalizeQueryInput,
  quoteIdentifier,
  toSqlType
};
