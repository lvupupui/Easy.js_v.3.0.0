# easy.js - Complete Database Support (SQL + NoSQL)

## Supported Databases

easy.js now supports **8 different database types** with a unified abstraction layer. Switch between databases with a single configuration change!

---

## Supported Database Engines

### 1. **MongoDB** (NoSQL - Document)
- **File**: `adapters/mongodb.js`
- **Driver**: mongoose@7.5.0
- **Use Case**: Flexible schema, rapid development
- **Connection**: MongoDB Atlas, Local MongoDB

### 2. **MySQL** (SQL - Relational)
- **File**: `adapters/mysql.js`
- **Driver**: mysql2@3.6.0
- **Use Case**: Structured data, ACID compliance
- **Connection**: MySQL 5.7+, MariaDB

### 3. **PostgreSQL** (SQL - Relational)
- **File**: `adapters/postgresql.js`
- **Driver**: pg@8.11.2
- **Use Case**: Advanced SQL, JSON support
- **Connection**: PostgreSQL 12+, Heroku Postgres, Amazon RDS

### 4. **Supabase** (SQL + Auth + Real-time)
- **File**: `adapters/supabase.js`
- **Driver**: @supabase/supabase-js@2.38.4
- **Use Case**: PostgreSQL + Auth + Realtime
- **Connection**: Supabase Cloud, Self-hosted

### 5. **Firebase/Firestore** (NoSQL - Document)
- **File**: `adapters/firebase.js`
- **Driver**: firebase-admin@12.0.0
- **Use Case**: Real-time, serverless, Google integration
- **Connection**: Google Firebase, Google Cloud

### 6. **Amazon DynamoDB** (NoSQL - Key-Value)
- **File**: `adapters/dynamodb.js`
- **Driver**: aws-sdk@2.1504.0
- **Use Case**: High-scale, serverless, real-time
- **Connection**: AWS DynamoDB, DynamoDB Local

### 7. **Elasticsearch** (Search + Analytics)
- **File**: `adapters/elasticsearch.js`
- **Driver**: @elastic/elasticsearch@8.10.0
- **Use Case**: Full-text search, analytics, logs
- **Connection**: Elasticsearch Cloud, Self-hosted

### 8. **Cassandra** (NoSQL - Wide-Column)
- **File**: `adapters/cassandra.js`
- **Driver**: cassandra-driver@4.7.2
- **Use Case**: High-scale, distributed, time-series
- **Connection**: Cassandra Cluster, Datastax Astra

---

## Usage in DSL

### Single Database

```easy
USE MONGODB mongodb://user:password@cluster.mongodb.net/dbname
USE POSTGRESQL postgresql://user:password@host:5432/dbname
USE FIREBASE projects/my-project/databases/my-db
USE DYNAMODB aws://region/table-name
USE ELASTICSEARCH http://elastic:password@host:9200
```

### Multiple Databases

```easy
USE MONGODB mongodb://cluster.mongodb.net/primary
USE ELASTICSEARCH http://elastic:9200
USE FIREBASE projects/my-project

# Primary: MongoDB
# Secondary: Elasticsearch for search
# Tertiary: Firebase for real-time
```

---

## API - Unified Query Interface

All databases use the same API:

```javascript
// Single database operation
await db.query('users', 'findOne', { email: 'user@example.com' });

// Query specific database
await db.queryDatabase('postgres', 'users', 'findMany', {});

// Switch primary database
await db.switchPrimaryDB('dynamodb');

// Get connected databases
const databases = db.getConnectedDatabases();
console.log(databases); // ['mongodb', 'elasticsearch', 'firebase']
```

---

## Database Adapters - Complete Reference

### MongoDB Adapter

```javascript
// Connection
db.adapters.mongodb.connect('mongodb://localhost/mydb', models);

// Operations
findOne(model, query)           // Get single document
findMany(model, query, options) // Get multiple documents
create(model, data)             // Insert document
update(model, data)             // Update document
delete(model, query)            // Delete documents
count(model, query)             // Count documents

// Features
- Flexible schema
- Aggregation pipeline
- Full-text search
- Transactions (Replica Set)
```

### MySQL Adapter

```javascript
// Connection
db.adapters.mysql.connect('mysql://user:pass@host/db', models);

// Operations
findOne(model, query)           // SELECT single row
findMany(model, query, options) // SELECT multiple rows
create(model, data)             // INSERT
update(model, data)             // UPDATE
delete(model, query)            // DELETE
count(model, query)             // COUNT(*)

// Features
- ACID transactions
- Foreign keys
- Indexes
- Joins
```

### PostgreSQL Adapter

```javascript
// Connection
db.adapters.postgresql.connect('postgresql://user:pass@host/db', models);

// Operations
findOne(model, query)           // SELECT single row
findMany(model, query, options) // SELECT multiple rows
create(model, data)             // INSERT
update(model, data)             // UPDATE
delete(model, query)            // DELETE
count(model, query)             // COUNT(*)
transaction(callback)           // BEGIN TRANSACTION

// Features
- ACID transactions
- JSON/JSONB support
- Full-text search
- Window functions
- CTEs (Common Table Expressions)
```

### Supabase Adapter

```javascript
// Connection
db.adapters.supabase.connect({
  url: 'https://xxx.supabase.co',
  key: 'anon-key'
}, models);

// Operations
findOne(model, query)           // Get single row
findMany(model, query, options) // Get multiple rows
create(model, data)             // Insert row
update(model, data)             // Update row
delete(model, query)            // Delete rows
count(model, query)             // Count rows

// Features
- PostgreSQL backend
- Real-time subscriptions
- Built-in auth
- RLS (Row Level Security)
- Automatic backups
```

### Firebase Adapter

```javascript
// Connection
db.adapters.firebase.connect({
  credentials: serviceAccount,
  databaseURL: 'https://project.firebaseio.com'
}, models);

// Operations
findOne(model, query)           // Get single document
findMany(model, query, options) // Get multiple documents
create(model, data)             // Add document
update(model, data)             // Update document
delete(model, query)            // Delete documents
count(model, query)             // Count documents

// Features
- Real-time listeners
- Offline persistence
- Full-text search
- Transactions
- Google authentication
```

### DynamoDB Adapter

```javascript
// Connection
db.adapters.dynamodb.connect({
  region: 'us-east-1',
  accessKeyId: 'xxx',
  secretAccessKey: 'xxx'
}, models);

// Operations
findOne(model, query)           // GetItem
findMany(model, query, options) // Query / Scan
create(model, data)             // PutItem
update(model, data)             // UpdateItem
delete(model, query)            // DeleteItem
count(model, query)             // Count

// Features
- Serverless
- On-demand pricing
- Global tables
- Point-in-time recovery
- TTL support
```

### Elasticsearch Adapter

```javascript
// Connection
db.adapters.elasticsearch.connect({
  node: 'http://localhost:9200',
  auth: { username: 'user', password: 'pass' }
}, models);

// Operations
findOne(model, query)           // Search single document
findMany(model, query, options) // Search multiple documents
create(model, data)             // Index document
update(model, data)             // Update document
delete(model, query)            // Delete documents
search(model, term, options)    // Full-text search

// Features
- Full-text search
- Analytics
- Log management
- Geo-spatial queries
- Machine learning
```

### Cassandra Adapter

```javascript
// Connection
db.adapters.cassandra.connect({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'myapp'
}, models);

// Operations
findOne(model, query)           // Select single row
findMany(model, query, options) // Select multiple rows
create(model, data)             // Insert
update(model, data)             // Update
delete(model, query)            // Delete
count(model, query)             // Count

// Features
- Distributed across nodes
- High availability
- Time-series data
- Wide-column format
- Linear scalability
```

---

## Multi-Database Operations

### Replicate to All Databases

```javascript
// Write same data to MongoDB, PostgreSQL, Elasticsearch
const results = await db.replicateToAll('users', 'create', {
  email: 'user@example.com',
  name: 'John Doe'
});

// results = {
//   mongodb: { id: '...', email: '...' },
//   postgresql: { id: 1, email: '...' },
//   elasticsearch: { id: '...', email: '...' }
// }
```

### Query Specific Database

```javascript
// Query MongoDB specifically
const mongoUsers = await db.queryDatabase('mongodb', 'users', 'findMany');

// Query PostgreSQL specifically
const pgUsers = await db.queryDatabase('postgresql', 'users', 'findMany');

// Query Elasticsearch
const searchResults = await db.queryDatabase('elasticsearch', 'users', 'search', 'john');
```

### Switch Primary Database

```javascript
// Start with MongoDB
db.switchPrimaryDB('mongodb');

// Switch to PostgreSQL
db.switchPrimaryDB('postgresql');

// All queries now use PostgreSQL
await db.query('users', 'findMany');
```

### Health Check

```javascript
const health = await db.healthCheck();

// Returns status of all connected databases
// {
//   mongodb: { status: 'connected' },
//   postgresql: { status: 'connected' },
//   elasticsearch: { status: 'error', error: 'Connection refused' }
// }
```

---

## Database Comparison

| Feature | MongoDB | MySQL | PostgreSQL | Supabase | Firebase | DynamoDB | Elasticsearch | Cassandra |
|---------|---------|-------|-----------|----------|----------|----------|---------------|-----------|
| Schema | Flexible | Strict | Strict | Strict | Flexible | Flexible | Flexible | Flexible |
| Transactions | ✓ | ✓ | ✓ | ✓ | ✓ | Limited | ✗ | Limited |
| Full-text Search | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓✓✓ | ✗ |
| Real-time | ✓ | ✗ | ✗ | ✓✓ | ✓✓✓ | ✓ | ✗ | ✗ |
| Scaling | Horizontal | Vertical | Vertical | Auto | Auto | Auto | Horizontal | Horizontal |
| Serverless | ✗ | ✗ | ✗ | ✓ | ✓✓ | ✓✓ | ✓ | ✗ |
| Cost | Moderate | Low | Low | Low | Moderate | Variable | Moderate | High |
| Setup | Easy | Easy | Easy | Easy | Easiest | Easy | Moderate | Hard |

---

## Configuration Examples

### MongoDB

```easy
USE MONGODB mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true
```

### MySQL

```easy
USE MYSQL mysql://root:password@localhost:3306/mydb
```

### PostgreSQL

```easy
USE POSTGRESQL postgresql://user:password@localhost:5432/mydb
```

### Supabase

```easy
USE SUPABASE {
  url: "https://xxx.supabase.co"
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Firebase

```easy
USE FIREBASE {
  projectId: "my-project"
  credentials: "/path/to/serviceAccountKey.json"
}
```

### DynamoDB

```easy
USE DYNAMODB {
  region: "us-east-1"
  accessKeyId: "AKIA..."
  secretAccessKey: "wJalrXUtnFEMI/..."
}
```

### Elasticsearch

```easy
USE ELASTICSEARCH {
  node: "https://user:pass@elastic.example.com:9200"
}
```

### Cassandra

```easy
USE CASSANDRA {
  contactPoints: ["127.0.0.1", "127.0.0.2"]
  keyspace: "myapp"
}
```

---

## Performance Characteristics

### Write Speed (ops/sec)
1. Cassandra: 100,000+
2. DynamoDB: 50,000+
3. Elasticsearch: 40,000+
4. MongoDB: 30,000+
5. PostgreSQL: 20,000+
6. MySQL: 15,000+
7. Firebase: 10,000+
8. Supabase: 10,000+

### Read Speed (ops/sec)
1. Cassandra: 500,000+
2. DynamoDB: 100,000+
3. MongoDB: 80,000+
4. PostgreSQL: 70,000+
5. MySQL: 50,000+
6. Elasticsearch: 40,000+
7. Firebase: 30,000+
8. Supabase: 25,000+

### Query Latency (average)
1. Redis/Cache: 1ms
2. Cassandra: 5ms
3. DynamoDB: 10ms
4. MongoDB: 15ms
5. PostgreSQL: 20ms
6. MySQL: 20ms
7. Elasticsearch: 50ms
8. Firebase: 100ms

---

## Choosing the Right Database

### Use MongoDB if:
- Flexible schema
- Rapid development
- Document-based data
- Easy scaling

### Use MySQL if:
- Traditional relational data
- Cost-conscious
- Structured schema
- ACID compliance critical

### Use PostgreSQL if:
- Advanced SQL features
- JSON support needed
- Full-text search
- Complex queries

### Use Supabase if:
- PostgreSQL + Auth
- Real-time needed
- Minimal setup
- Firebase alternative

### Use Firebase if:
- Real-time sync needed
- Google ecosystem
- Rapid prototyping
- Serverless first

### Use DynamoDB if:
- High-scale serverless
- AWS ecosystem
- Pay-per-request
- Global distribution

### Use Elasticsearch if:
- Full-text search critical
- Analytics needed
- Log aggregation
- Complex search

### Use Cassandra if:
- Massive distributed scale
- High availability critical
- Time-series data
- Wide-column model

---

## Migration Between Databases

```javascript
// Easy migration with unified API
const sourceDB = db.getAdapter('mongodb');
const targetDB = db.getAdapter('postgresql');

// Get all data
const allUsers = await sourceDB.query('users', 'findMany');

// Write to new database
for (const user of allUsers) {
  await targetDB.query('users', 'create', user);
}
```

---

## Summary

easy.js now provides **complete database flexibility**:

✓ 8 database types supported
✓ Unified query API across all databases
✓ Switch databases with config change
✓ Multi-database support
✓ Replication across databases
✓ Health monitoring
✓ Transaction support (where applicable)
✓ Production-ready drivers

You can build your entire application with one database, then seamlessly switch to another as your needs evolve!

