module.exports = {
  types: ['string', 'email', 'password', 'number', 'integer', 'boolean', 'date', 'datetime', 'object', 'array', 'json', 'uuid', 'text'],
  declarations: ['START SERVER', 'USE', 'SECURITY', 'DOCS', 'ADMIN', 'MODEL', 'AUTH', 'ROLE', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PROTECT', 'VALIDATE', 'JOB'],
  validationRules: ['required', 'email', 'url', 'uuid', 'number', 'boolean', 'date', 'min', 'max'],
  securityPresets: {
    strict: ['helmet', 'cors', 'rateLimit', 'validation', 'audit', 'secureHeaders'],
    standard: ['helmet', 'cors', 'validation'],
    off: []
  }
};
