const validator = require('validator');

class ValidationEngine {
  constructor() {
    this.rules = {};
  }

  loadRules(validations) {
    for (const validation of validations) {
      this.rules[validation.model] = validation.rules;
    }
  }

  validate(model, data) {
    const modelRules = this.rules[model];
    if (!modelRules) return null;

    const errors = {};

    for (const [field, rule] of Object.entries(modelRules)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rule);

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  validateField(field, value, rules) {
    const errors = [];
    const ruleParts = rules.split(':');

    for (const rule of ruleParts) {
      const [ruleName, ...params] = rule.split('=');

      switch (ruleName.toLowerCase().trim()) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(`${field} is required`);
          }
          break;

        case 'email':
          if (value && !validator.isEmail(value)) {
            errors.push(`${field} must be a valid email`);
          }
          break;

        case 'min':
          const minLength = parseInt(params[0]);
          if (value && value.length < minLength) {
            errors.push(`${field} must be at least ${minLength} characters`);
          }
          break;

        case 'max':
          const maxLength = parseInt(params[0]);
          if (value && value.length > maxLength) {
            errors.push(`${field} must not exceed ${maxLength} characters`);
          }
          break;

        case 'numeric':
          if (value && !validator.isNumeric(String(value))) {
            errors.push(`${field} must be numeric`);
          }
          break;

        case 'alphanumeric':
          if (value && !validator.isAlphanumeric(String(value))) {
            errors.push(`${field} must be alphanumeric`);
          }
          break;

        case 'url':
          if (value && !validator.isURL(value)) {
            errors.push(`${field} must be a valid URL`);
          }
          break;

        case 'phone':
          if (value && !validator.isMobilePhone(value)) {
            errors.push(`${field} must be a valid phone number`);
          }
          break;

        case 'unique':
          // Unique validation would be handled at database level
          break;

        default:
          // Unknown rule, skip
          break;
      }
    }

    return errors;
  }
}

module.exports = ValidationEngine;
