const Tokenizer = require('./Tokenizer');
const ASTBuilder = require('./ASTBuilder');

class Parser {
  constructor() {
    this.tokenizer = new Tokenizer();
    this.astBuilder = new ASTBuilder();
  }

  parse(content) {
    if (typeof this.astBuilder.buildFromContent === 'function') {
      return this.astBuilder.buildFromContent(content);
    }
    const tokens = this.tokenizer.tokenize(content);
    return this.astBuilder.build(tokens);
  }
}

module.exports = Parser;
