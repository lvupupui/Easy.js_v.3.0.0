# Runtime Semantics

Author: Avi Ranjan Prasad

## Server

`START SERVER <port>` creates an Express server bound to `0.0.0.0`.

## Database

`USE <database> <connection>` registers a database adapter. The first database is the primary database.

## Model

`MODEL` declarations become database schemas and route targets.

## Route

Routes map to CRUD operations:

- `GET /items FROM items` -> find all
- `GET /items/:id FROM items` -> find one by id
- `POST /items FROM items` -> create
- `PUT /items/:id FROM items` -> update
- `DELETE /items/:id FROM items` -> delete

## Protection

`PROTECT /path` applies JWT middleware to matching paths.

## Validation

`VALIDATE model { ... }` checks request bodies before create/update operations.

## Security

`SECURITY strict` enables the strict security preset: headers, request limits, validation, auth hardening, rate limits, and audit-ready behavior.
