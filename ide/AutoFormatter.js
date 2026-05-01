class AutoFormatter {
  constructor() {
    this.indentSize = 2;
    this.lineLength = 80;
  }

  formatCode(code) {
    let formatted = code;

    // Step 1: Normalize whitespace
    formatted = this.normalizeWhitespace(formatted);

    // Step 2: Add proper indentation
    formatted = this.addIndentation(formatted);

    // Step 3: Format JSX/HTML
    formatted = this.formatJSX(formatted);

    // Step 4: Format attributes
    formatted = this.formatAttributes(formatted);

    // Step 5: Add spacing around operators
    formatted = this.formatOperators(formatted);

    return formatted;
  }

  normalizeWhitespace(code) {
    // Remove trailing whitespace
    let normalized = code.split('\n').map(line => line.trimRight()).join('\n');

    // Remove multiple blank lines
    normalized = normalized.replace(/\n\n+/g, '\n\n');

    // Remove spaces before semicolons
    normalized = normalized.replace(/\s+;/g, ';');

    // Remove spaces before commas
    normalized = normalized.replace(/\s+,/g, ',');

    return normalized;
  }

  addIndentation(code) {
    const lines = code.split('\n');
    let indentLevel = 0;
    const indent = ' '.repeat(this.indentSize);

    return lines.map(line => {
      const trimmed = line.trim();

      if (!trimmed) return '';

      // Decrease indent for closing brackets/tags
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indented = indent.repeat(indentLevel) + trimmed;

      // Increase indent for opening brackets/tags (but not self-closing)
      if ((trimmed.endsWith('{') || trimmed.endsWith('[')) ||
          (trimmed.match(/<[^/][^>]*[^/]>$/) && !trimmed.match(/\/>$/))) {
        indentLevel++;
      }

      return indented;
    }).join('\n');
  }

  formatJSX(code) {
    let formatted = code;

    // Add newline after opening tags (except single-line)
    formatted = formatted.replace(/(<[^/][^>]*>)([^<\s])/g, '$1\n$2');

    // Add newline before closing tags
    formatted = formatted.replace(/([^>])<\//g, '$1\n</');

    // Fix self-closing tags
    formatted = formatted.replace(/<(\w+)([^>]*)>\s*<\/\1>/g, '<$1$2 />');

    // Format empty fragments
    formatted = formatted.replace(/<>\s*<\/>/g, '<></>');

    return formatted;
  }

  formatAttributes(code) {
    const lines = code.split('\n');

    return lines.map(line => {
      const trimmed = line.trim();

      // Skip if not a tag
      if (!trimmed.includes('<')) return line;

      // Format className attributes
      if (trimmed.includes('className="')) {
        const prefix = line.match(/^\s*/)[0];
        const match = trimmed.match(/className="([^"]*)"/);

        if (match && match[1].length > this.lineLength - prefix.length) {
          // Split long className into multiple lines
          const classes = match[1].split(' ');
          let formatted = trimmed.replace(/className="[^"]*"/, `className={\n${prefix}  ${classes.join('\n' + prefix + '  ')}\n${prefix}}`);
          return prefix + formatted;
        }
      }

      // Remove spaces around equals in attributes
      const formatted = trimmed.replace(/\s*=\s*/g, '=');

      const prefix = line.match(/^\s*/)[0];
      return prefix + formatted;

    }).join('\n');
  }

  formatOperators(code) {
    let formatted = code;

    // Add spacing around binary operators (but not in attributes)
    // eslint-disable-next-line no-regex-spaces
    formatted = formatted.replace(/([^=!<>+\-*/%&|^])(={1,2}|!==?|<={0,2}|>={0,2}|\+|-|\*|\/|%|&|===)([^=])/g, '$1 $2 $3');

    // Add spacing around arrow in arrow functions
    formatted = formatted.replace(/=>\s*/g, ' => ');

    // Remove spacing in template literals
    formatted = formatted.replace(/`\s+/g, '`');
    formatted = formatted.replace(/\s+`/g, '`');

    return formatted;
  }

  validateSyntax(code) {
    const errors = [];

    // Check for unclosed tags
    const tagStack = [];
    const tagRegex = /<(\w+)(?:\s[^>]*)?>|<\/(\w+)>/g;
    let match;

    while ((match = tagRegex.exec(code)) !== null) {
      const [, openTag, closeTag] = match;

      if (openTag && !['img', 'input', 'br', 'hr'].includes(openTag)) {
        tagStack.push({ tag: openTag, position: match.index });
      } else if (closeTag) {
        const last = tagStack.pop();
        if (!last || last.tag !== closeTag) {
          errors.push({
            type: 'error',
            message: `Mismatched closing tag: </${closeTag}>`,
            position: match.index
          });
        }
      }
    }

    // Check for unclosed brackets
    const brackets = { '{': '}', '[': ']', '(': ')' };
    const stack = [];

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      if (brackets[char]) {
        stack.push({ bracket: char, position: i });
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last.bracket] !== char) {
          errors.push({
            type: 'error',
            message: `Mismatched bracket: ${char}`,
            position: i
          });
        }
      }
    }

    if (stack.length > 0) {
      errors.push({
        type: 'error',
        message: 'Unclosed bracket',
        position: stack[0].position
      });
    }

    // Check for missing closing parentheses in function calls
    const funcRegex = /\b(map|filter|reduce|forEach)\s*\(/g;
    while ((match = funcRegex.exec(code)) !== null) {
      const openPos = match.index + match[0].length - 1;
      let closePos = -1;
      let depth = 1;

      for (let i = openPos + 1; i < code.length && depth > 0; i++) {
        if (code[i] === '(') depth++;
        else if (code[i] === ')') depth--;
        if (depth === 0) closePos = i;
      }

      if (closePos === -1) {
        errors.push({
          type: 'error',
          message: `Unclosed function call: ${match[1]}()`,
          position: match.index
        });
      }
    }

    // Warnings for code style
    if (!code.includes('key=') && code.includes('.map(')) {
      errors.push({
        type: 'warning',
        message: 'Missing key prop in list rendering'
      });
    }

    if (code.includes('<img') && !code.includes('alt=')) {
      errors.push({
        type: 'warning',
        message: 'Image missing alt attribute (accessibility)'
      });
    }

    return errors;
  }

  minifyCode(code) {
    let minified = code;

    // Remove comments
    minified = minified.replace(/\/\/.*$/gm, '');
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove unnecessary whitespace
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}();,:])\s*/g, '$1');

    // Remove newlines
    minified = minified.replace(/\n/g, '');

    return minified;
  }

  prettifyCode(code) {
    return this.formatCode(code);
  }
}

module.exports = AutoFormatter;
