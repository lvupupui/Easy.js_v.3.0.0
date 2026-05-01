const fs = require('fs');
const path = require('path');

class ModuleResolver {
  resolve(entryFile, seen = new Set()) {
    const fullPath = path.resolve(entryFile);
    if (seen.has(fullPath)) return '';
    seen.add(fullPath);

    const dir = path.dirname(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    return content.replace(/^\s*IMPORT\s+(.+)$/gim, (line, importPath) => {
      const cleanPath = importPath.trim().replace(/^['"]|['"]$/g, '');
      const resolved = path.resolve(dir, cleanPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Imported file not found: ${cleanPath}`);
      }
      return this.resolve(resolved, seen);
    });
  }
}

module.exports = ModuleResolver;
