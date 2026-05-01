function optionalRequire(packageName, featureName = packageName) {
  try {
    return require(packageName);
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `${featureName} requires the optional package "${packageName}". ` +
        `Install it with "npm install ${packageName}" before using this feature.`
      );
    }
    throw error;
  }
}

module.exports = optionalRequire;
