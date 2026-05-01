const ValidationEngine = require('../../core/validator');

describe('ValidationEngine', () => {
  it('validates configured model rules and returns field errors', () => {
    const validator = new ValidationEngine();
    validator.loadRules([
      {
        model: 'users',
        rules: {
          email: 'required:email',
          password: 'required:min=8:max=20',
          age: 'numeric',
          username: 'alphanumeric',
          website: 'url'
        }
      }
    ]);

    const errors = validator.validate('users', {
      email: 'bad-email',
      password: 'short',
      age: 'not-number',
      username: 'bad user!',
      website: 'not-url'
    });

    expect(errors.email).toContain('email must be a valid email');
    expect(errors.password).toContain('password must be at least 8 characters');
    expect(errors.age).toContain('age must be numeric');
    expect(errors.username).toContain('username must be alphanumeric');
    expect(errors.website).toContain('website must be a valid URL');
  });

  it('returns null for valid or unconfigured models', () => {
    const validator = new ValidationEngine();
    validator.loadRules([{ model: 'users', rules: { email: 'required:email' } }]);

    expect(validator.validate('users', { email: 'valid@example.com' })).toBeNull();
    expect(validator.validate('posts', { title: '' })).toBeNull();
  });
});
