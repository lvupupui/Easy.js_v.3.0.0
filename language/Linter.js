class EasyLinter {
  lint(text, ast = null) {
    const diagnostics = [];
    const lines = text.split(/\r?\n/);

    if (!/\bSTART\s+SERVER\s+\d+/i.test(text)) {
      diagnostics.push(this.issue('error', 'Missing START SERVER declaration', 1, 1, 'EASY001'));
    }

    if (!/\bSECURITY\s+strict\b/i.test(text)) {
      diagnostics.push(this.issue('warning', 'Use SECURITY strict for production-safe defaults', 1, 1, 'EASY002'));
    }

    lines.forEach((line, index) => {
      if (/JWT_SECRET=.*(change|replace|secret-key-here)/i.test(line)) {
        diagnostics.push(this.issue('warning', 'Replace placeholder JWT secret before production', index + 1, 1, 'EASY003'));
      }
      if (/MODEL\s+\w+\s*\{/.test(line) && !text.slice(text.indexOf(line)).includes('}')) {
        diagnostics.push(this.issue('error', 'Model block is missing a closing brace', index + 1, 1, 'EASY004'));
      }
    });

    if (ast) {
      const modelNames = new Set((ast.models || []).map(model => model.name));
      for (const route of ast.routes || []) {
        if (route.model !== 'system' && !modelNames.has(route.model)) {
          diagnostics.push(this.issue('error', `Route references unknown model ${route.model}`, 1, 1, 'EASY005'));
        }
      }
    }

    return diagnostics;
  }

  issue(severity, message, line, column, code) {
    return { severity, message, line, column, code };
  }
}

module.exports = EasyLinter;
