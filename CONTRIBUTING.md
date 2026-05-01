# Contributing to easy.js

Thank you for helping make easy.js simple, secure, and useful.

## Development

```bash
npm install
npm run verify
npm test
```

## Language Changes

Language changes should update:

- `grammar/easyjs.ebnf`
- `docs/LANGUAGE_SPEC.md`
- `docs/RUNTIME_SEMANTICS.md`
- `docs/AST.md`
- `conformance/`
- parser/compiler tests

## Pull Request Checklist

- Keep syntax easy to read.
- Prefer secure defaults.
- Add or update tests.
- Update docs for user-facing behavior.
- Avoid committing secrets, generated logs, or local build output.

## Code Style

- Use CommonJS for framework runtime modules unless a package already uses another style.
- Keep errors human-readable.
- Keep generated starter projects small, obvious, and production-aware.
