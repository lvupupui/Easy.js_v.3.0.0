# Backward Compatibility Policy

Author: Avi Ranjan Prasad

## Syntax Versions

easy.js syntax is versioned by the package major version.

- Patch versions may fix parser bugs.
- Minor versions may add new declarations.
- Major versions may remove or change syntax.

## Stability Rules

- Existing declarations should keep their meaning across minor versions.
- New declarations should be optional.
- Generated runtime behavior should prefer additive changes.
- Deprecations should warn for at least one minor release before removal.
