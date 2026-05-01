class EasyFormatter {
  format(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let indent = 0;
    const out = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (out[out.length - 1] !== '') out.push('');
        continue;
      }

      if (line.startsWith('}')) indent = Math.max(0, indent - 1);
      out.push(`${'  '.repeat(indent)}${line}`);
      if (line.endsWith('{')) indent++;
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
}

module.exports = EasyFormatter;
