class QueryBuilder {
  constructor(model = null) {
    this.model = model;
    this.state = {
      filters: {},
      select: [],
      sort: {},
      limit: null,
      offset: 0,
      joins: [],
      includes: []
    };
  }

  static for(model) {
    return new QueryBuilder(model);
  }

  where(field, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = 'eq';
    }
    this.state.filters[field] = { operator, value };
    return this;
  }

  search(fields, term) {
    this.state.search = { fields: Array.isArray(fields) ? fields : [fields], term };
    return this;
  }

  select(...fields) {
    this.state.select.push(...fields.flat());
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.state.sort[field] = String(direction).toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this;
  }

  paginate({ limit = 20, page = 1, offset = null } = {}) {
    this.state.limit = Math.max(parseInt(limit, 10) || 20, 1);
    this.state.offset = offset === null
      ? (Math.max(parseInt(page, 10) || 1, 1) - 1) * this.state.limit
      : Math.max(parseInt(offset, 10) || 0, 0);
    return this;
  }

  include(relation) {
    this.state.includes.push(relation);
    return this;
  }

  join(model, localKey, foreignKey, type = 'left') {
    this.state.joins.push({ model, localKey, foreignKey, type });
    return this;
  }

  toAdapterOptions() {
    return {
      filter: this.toFilterObject(),
      fields: this.state.select,
      sort: this.state.sort,
      limit: this.state.limit,
      skip: this.state.offset,
      joins: this.state.joins,
      includes: this.state.includes,
      search: this.state.search
    };
  }

  toFilterObject() {
    return Object.entries(this.state.filters).reduce((acc, [field, condition]) => {
      if (condition.operator === 'eq') {
        acc[field] = condition.value;
      } else {
        acc[field] = { [`$${condition.operator}`]: condition.value };
      }
      return acc;
    }, {});
  }

  async execute(db, operation = 'findMany') {
    if (!this.model) {
      throw new Error('QueryBuilder requires a model before execution');
    }
    return db.query(this.model, operation, null, this.toAdapterOptions());
  }
}

module.exports = QueryBuilder;
