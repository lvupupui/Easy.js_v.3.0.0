const Parser = require('../../parser/Parser');
const Compiler = require('../../compiler/Compiler');
const { TypeChecker, Formatter, Linter, Playground } = require('../../language');

const source = `START SERVER 3000
USE MONGODB mongodb://localhost:27017/test
SECURITY strict
MODEL users {
name: string
email: email
}
GET /users FROM users
VALIDATE users {
email: required:email
}`;

describe('easy.js language layer', () => {
  it('parses, type-checks, and compiles valid source', () => {
    const ast = new Parser().parse(source);
    expect(new TypeChecker().check(ast).ok).toBe(true);
    const config = new Compiler().compile(ast);
    expect(config.models).toHaveLength(1);
    expect(config.routes).toHaveLength(1);
    expect(config.databases[0].connection).toBe('mongodb://localhost:27017/test');
  });

  it('formats source', () => {
    const formatted = new Formatter().format(source);
    expect(formatted).toContain('  name: string');
  });

  it('lints missing strict security', () => {
    const diagnostics = new Linter().lint('START SERVER 3000');
    expect(diagnostics.some(item => item.code === 'EASY002')).toBe(true);
  });

  it('runs playground analysis', () => {
    const result = new Playground().run(source);
    expect(result.types.ok).toBe(true);
    expect(result.config.models).toHaveLength(1);
  });
});
