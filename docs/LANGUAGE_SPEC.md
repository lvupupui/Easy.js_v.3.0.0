# easy.js Language Specification

Author: Avi Ranjan Prasad

easy.js is a declarative backend language that compiles into Node.js/Express applications.

## Design Goals

- Human-readable backend definitions
- Secure defaults
- Low ceremony
- Generated Express code that remains inspectable
- Stable syntax with versioned compatibility

## Compilation Pipeline

1. Resolve imports.
2. Tokenize and parse source into an AST.
3. Type-check models, routes, validation, auth, roles, jobs, and security declarations.
4. Compile AST to runtime configuration.
5. Runtime creates Express routes, middleware, database adapters, auth, validation, jobs, docs, and admin surfaces.

## Core Declarations

```easy
START SERVER 3000
USE MONGODB mongodb://localhost:27017/app
SECURITY strict
DOCS openapi
ADMIN enabled
```

## Models

```easy
MODEL users {
  name: string
  email: email
  password: password
}
```

## Routes

```easy
GET /users FROM users
POST /users FROM users
PROTECT /users
```

## Auth

```easy
AUTH users BY jwt
AUTH refresh_tokens enabled
AUTH password_reset enabled
AUTH email_verification enabled
```

## Roles

```easy
ROLE admin CAN *
ROLE user CAN posts:read, posts:create
```

## Jobs

```easy
JOB cleanup EVERY 1h {
  LOG "Cleaning expired records"
}
```
