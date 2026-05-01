# easy.js AST

Author: Avi Ranjan Prasad

The parser returns this high-level AST shape:

```js
{
  server: { port, host },
  databases: [{ type, connection }],
  models: [{ name, schema }],
  routes: [{ method, path, model }],
  auth: { model, type, features },
  protections: [{ path }],
  validations: [{ model, rules }],
  middleware: [],
  security: 'strict',
  docs: true,
  admin: true,
  roles: [{ role, permissions }],
  jobs: [{ name, every, body }]
}
```
