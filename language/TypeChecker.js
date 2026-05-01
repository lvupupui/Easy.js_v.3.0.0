const LanguageError = require('./LanguageError');

class TypeChecker {
  constructor() {
    this.validTypes = new Set([
      'string', 'email', 'password', 'number', 'integer', 'boolean', 'date',
      'datetime', 'object', 'array', 'json', 'uuid', 'text'
    ]);
  }

  check(ast) {
    const errors = [];
    const modelNames = new Set((ast.models || []).map(model => model.name));

    for (const model of ast.models || []) {
      for (const [field, type] of Object.entries(model.schema || {})) {
        if (!this.validTypes.has(String(type).toLowerCase())) {
          errors.push(new LanguageError(`Unknown type '${type}' on ${model.name}.${field}`, null, 'EASY_UNKNOWN_TYPE'));
        }
      }
    }

    for (const route of ast.routes || []) {
      if (route.model !== 'system' && !modelNames.has(route.model)) {
        errors.push(new LanguageError(`Route ${route.method} ${route.path} references unknown model '${route.model}'`, null, 'EASY_UNKNOWN_MODEL'));
      }
    }

    for (const validation of ast.validations || []) {
      if (!modelNames.has(validation.model)) {
        errors.push(new LanguageError(`Validation references unknown model '${validation.model}'`, null, 'EASY_UNKNOWN_MODEL'));
      }
    }

    return {
      ok: errors.length === 0,
      errors
    };
  }

  assert(ast) {
    const result = this.check(ast);
    if (!result.ok) {
      throw result.errors[0];
    }
    return ast;
  }
}

module.exports = TypeChecker;
