# Database Support

easy.js uses one database adapter contract across generated REST routes and direct framework calls.

## Unified Operations

All adapters receive these canonical operations:

- `findMany`
- `findOne`
- `create`
- `update`
- `delete`
- `count`

Generated route operations such as `findAll`, `findById`, `updateById`, and `deleteById` are normalized automatically by `DatabaseManager`.

## Implemented Adapters

Local/offline:

- SQLite through `sql.js`: `USE SQLITE ./data/app.sqlite`
- Redis key-value CRUD: `USE REDIS redis://localhost:6379`

SQL and SQL-compatible:

- MySQL: `USE MYSQL mysql://user:pass@host:3306/db`
- MariaDB: `USE MARIADB mysql://user:pass@host:3306/db`
- PlanetScale: `USE PLANETSCALE mysql://user:pass@host:3306/db?ssl=true`
- PostgreSQL: `USE POSTGRES postgres://user:pass@host:5432/db`
- Neon: `USE NEON postgres://user:pass@host/db`
- CockroachDB: `USE COCKROACHDB postgres://user:pass@host:26257/db`
- SQL Server: `USE MSSQL sqlserver://user:pass@host:1433/db`

Cloud/serverless:

- Supabase: object config through `DatabaseManager`
- Firebase/Firestore: object config through `DatabaseManager`
- DynamoDB: object config through `DatabaseManager`
- Turso/libSQL: `USE TURSO libsql://database.turso.io`

Search, graph, and wide-column:

- Elasticsearch/OpenSearch
- Neo4j
- Cassandra

Optional registry entries:

- Oracle requires `oracledb`
- Snowflake requires `snowflake-sdk`
- BigQuery requires `@google-cloud/bigquery`

These are registered as guarded optional adapters because their SDKs are large, native, or provider-specific. The framework will give a clear install/configuration error if selected without the optional package.

## Adapter Guarantees

Implemented adapters expose:

- `connect`
- `query`
- `healthCheck`
- `close` or `disconnect`

SQL-style adapters sanitize table and column identifiers before building SQL. Values are passed through parameterized queries where supported by the underlying driver.

## Live Adapter Validation

Run `npm run test:live:adapters` for the live adapter contract suite. It is skipped unless `LIVE_ADAPTERS=true` is set. See `docs/LIVE_ADAPTERS.md` for complete setup examples.

Local adapters use these defaults unless overridden: `POSTGRES_URL`, `REDIS_URL`, and `MONGODB_URL`.

Provider adapters run only when their required service configuration is present:

- Supabase: `SUPABASE_URL`, `SUPABASE_KEY`, optional `SUPABASE_TABLE`
- Firebase/Firestore: `FIREBASE_PROJECT_ID` plus one of `FIREBASE_CREDENTIALS_JSON`, `FIREBASE_CREDENTIALS_BASE64`, or `FIREBASE_CREDENTIALS_FILE`
- DynamoDB: `AWS_REGION` plus `DYNAMODB_ENDPOINT`, `AWS_PROFILE`, or `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`; optional `DYNAMODB_TABLE`
- Elasticsearch/OpenSearch: `ELASTICSEARCH_URL`, optional basic auth, API key, and `ELASTICSEARCH_INDEX`
- Cassandra: `CASSANDRA_CONTACT_POINTS`, `CASSANDRA_KEYSPACE`, optional `CASSANDRA_LOCAL_DATACENTER`, username/password, SSL, or secure-connect bundle settings
- Neo4j: `NEO4J_URL`

Supabase tables must already exist because the public Supabase client cannot create schema. Use `docs/supabase-live-validation.sql` in the Supabase SQL editor, or point `SUPABASE_TABLE` at an equivalent table. Other live providers create or initialize their test table, collection, index, label, or keyspace through the adapter lifecycle.
