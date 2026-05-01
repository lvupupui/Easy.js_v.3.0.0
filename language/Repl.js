const readline = require('readline');
const Parser = require('../parser/Parser');
const Compiler = require('../compiler/Compiler');
const TypeChecker = require('./TypeChecker');

class EasyRepl {
  constructor() {
    this.buffer = '';
    this.parser = new Parser();
    this.compiler = new Compiler();
    this.typeChecker = new TypeChecker();
  }

  eval(input) {
    this.buffer += `${input}\n`;
    const ast = this.parser.parse(this.buffer);
    this.typeChecker.assert(ast);
    return this.compiler.compile(ast);
  }

  start() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'easy> ' });
    rl.prompt();
    rl.on('line', line => {
      try {
        if (line.trim() === '.clear') this.buffer = '';
        else console.log(JSON.stringify(this.eval(line), null, 2));
      } catch (error) {
        console.error(error.message);
      }
      rl.prompt();
    });
  }
}

if (require.main === module) {
  new EasyRepl().start();
}

module.exports = EasyRepl;
