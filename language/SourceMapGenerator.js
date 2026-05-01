class EasySourceMapGenerator {
  generate(sourceFile, generatedFile, mappings = []) {
    return {
      version: 3,
      file: generatedFile,
      sources: [sourceFile],
      names: mappings.map(mapping => mapping.name).filter(Boolean),
      mappings: '',
      'x-easyjs-mappings': mappings
    };
  }

  mapNode(name, sourceLine, sourceColumn, generatedLine, generatedColumn) {
    return { name, sourceLine, sourceColumn, generatedLine, generatedColumn };
  }
}

module.exports = EasySourceMapGenerator;
