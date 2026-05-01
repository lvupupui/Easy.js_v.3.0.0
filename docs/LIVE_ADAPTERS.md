# Live Adapter Validation

The live adapter suite validates the shared CRUD and health-check contract against real services. It is skipped by default so normal CI does not require paid cloud credentials or local Docker services.

Run it with:

```bash
LIVE_ADAPTERS=true npm run test:live:adapters
```

On Windows PowerShell:

```powershell
$env:LIVE_ADAPTERS="true"
npm.cmd run test:live:adapters
```

## Local Defaults

When `LIVE_ADAPTERS=true`, PostgreSQL, Redis, and MongoDB use these defaults unless overridden:

- `POSTGRES_URL=postgres://easyjs:easyjs@localhost:5432/easyjs_test`
- `REDIS_URL=redis://localhost:6379`
- `MONGODB_URL=mongodb://localhost:27017/easyjs_test`

## Supabase

Required:

- `SUPABASE_URL`
- `SUPABASE_KEY`

Optional:

- `SUPABASE_TABLE=live_users`

Supabase does not create tables through the public JS client. Create the table first with `docs/supabase-live-validation.sql` or point `SUPABASE_TABLE` at an equivalent table with `id`, `email`, and `name` columns.

## Firebase/Firestore

Required:

- `FIREBASE_PROJECT_ID`
- One of `FIREBASE_CREDENTIALS_JSON`, `FIREBASE_CREDENTIALS_BASE64`, or `FIREBASE_CREDENTIALS_FILE`

Optional:

- `FIREBASE_DATABASE_URL`

The JSON credentials path is easiest for CI. If using an inline JSON value, escaped private-key newlines are normalized by the test harness.

## DynamoDB

Required:

- `AWS_REGION`
- One of `DYNAMODB_ENDPOINT`, `AWS_PROFILE`, or `AWS_ACCESS_KEY_ID` plus `AWS_SECRET_ACCESS_KEY`

Optional:

- `DYNAMODB_TABLE=live_users`

The adapter creates the test table if it does not exist and waits until it is active. It deletes test records after each run, but it intentionally does not delete the table. Keeping the table is safer for shared or cloud accounts and makes repeated runs faster.

For DynamoDB Local, set:

```text
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

## Elasticsearch/OpenSearch

Required:

- `ELASTICSEARCH_URL`

Optional:

- `ELASTICSEARCH_USERNAME`
- `ELASTICSEARCH_PASSWORD`
- `ELASTICSEARCH_API_KEY`
- `ELASTICSEARCH_INDEX=live_users`

Use either API key auth or username/password auth. The suite refreshes the index after writes so reads are deterministic.

## Cassandra

Required:

- `CASSANDRA_CONTACT_POINTS`
- `CASSANDRA_KEYSPACE`

Optional:

- `CASSANDRA_LOCAL_DATACENTER=datacenter1`
- `CASSANDRA_USERNAME`
- `CASSANDRA_PASSWORD`
- `CASSANDRA_SSL=true`
- `CASSANDRA_SECURE_CONNECT_BUNDLE=/path/to/secure-connect.zip`

The adapter creates the keyspace and table if needed. Identifiers are validated before CQL interpolation, so keyspace, table, and field names must use letters, digits, and underscores and cannot start with a digit.

## Neo4j

Required:

- `NEO4J_URL=neo4j://neo4j:password@localhost:7687`

The adapter creates a uniqueness constraint for the test label and deletes test nodes after each run.

## Reading Results

If `LIVE_ADAPTERS=true` is not set, the entire suite is skipped. If it is set but a provider's env vars are missing, that provider's test is skipped with the missing variable names in the test title.
