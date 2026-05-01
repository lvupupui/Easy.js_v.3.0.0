class LanguageError extends Error {
  constructor(message, location = null, code = 'EASY_LANG_ERROR') {
    super(location ? `${message} at ${location.line}:${location.column}` : message);
    this.name = 'LanguageError';
    this.code = code;
    this.location = location;
  }
}

module.exports = LanguageError;
