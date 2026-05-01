const Parser = require('../parser/Parser');
const Compiler = require('../compiler/Compiler');
const TypeChecker = require('./TypeChecker');
const EasyFormatter = require('./Formatter');
const EasyLinter = require('./Linter');

class EasyPlayground {
  constructor() {
    this.parser = new Parser();
    this.compiler = new Compiler();
    this.typeChecker = new TypeChecker();
    this.formatter = new EasyFormatter();
    this.linter = new EasyLinter();
  }

  run(source) {
    const formatted = this.formatter.format(source);
    const ast = this.parser.parse(formatted);
    const types = this.typeChecker.check(ast);
    const diagnostics = this.linter.lint(formatted, ast);
    const config = types.ok ? this.compiler.compile(ast) : null;
    return { formatted, ast, types, diagnostics, config };
  }
}

module.exports = EasyPlayground;
