# easy.js Architecture Documentation

## System Overview

easy.js is a full-stack backend framework that compiles a simple Domain-Specific Language (DSL) into a production-ready Node.js/Express application with built-in security, validation, and database support.

```
┌─────────────────────────────────────────────────────────────────┐
│                        easy.js Framework                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   CLI Tool (index)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Parser Module     │
                    │  - Tokenizer       │
                    │  - ASTBuilder      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Compiler Module    │
                    │  - Schema Gen       │
                    │  - Route Gen        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  RuntimeEngine      │
                    │  - Express Setup    │
                    │  - Middleware Load  │
                    │  - Route Register   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────┴───────┐  ┌──┴────┐  ┌──────┴──────┐
        │   Database    │  │  Auth  │  │  Validation │
        │  (MongoDB/    │  │ (JWT)  │  │   Engine    │
        │   MySQL)      │  │        │  │             │
        └───────────────┘  └────────┘  └─────────────┘
```

## Component Breakdown

### 1. CLI Layer (cli/index.js)

**Responsibility**: Command-line interface for developers

**Key Functions**:
- Project creation
- Server startup
- Development mode with file watching
- Build process

**Example Usage**:
```bash
easyjs create my-api
easyjs start app.easy
easyjs dev app.easy
easyjs build
```

**Commands**:
- `create` - Scaffold new project
- `start` - Production server
- `dev` - Development with watch mode
- `build` - Build for production

### 2. Parser Module (parser/)

**Responsibility**: Convert DSL text into Abstract Syntax Tree (AST)

**Components**:

#### Tokenizer (parser/Tokenizer.js)
- Splits DSL into tokens
- Recognizes keywords, identifiers, paths, strings
- Handles blocks and expressions

**Token Types**:
- Keywords: START, SERVER, USE, MODEL, GET, POST, etc.
- Identifiers: variable/model names
- Paths: /api/users, /posts/:id
- Strings: quoted values
- Blocks: {...} content
- Numbers: port numbers

#### ASTBuilder (parser/ASTBuilder.js)
- Constructs Abstract Syntax Tree from tokens
- Validates DSL syntax
- Builds semantic structure

**AST Structure**:
```javascript
{
  server: { port, host },
  databases: [{ type, connection }],
  models: [{ name, schema }],
  routes: [{ method, path, model }],
  auth: { model, type },
  protections: [{ path }],
  validations: [{ model, rules }],
  middleware: [names]
}
```

### 3. Compiler Module (compiler/)

**Responsibility**: Transform AST into executable configuration

**Key Functions**:
- Generate database schemas from models
- Map routes to handler functions
- Create validation configurations
- Prepare runtime configuration

**Schema Generation**:
```javascript
MODEL users { name: string, email: string }
  ↓ (MapType function)
  ↓
{ name: { type: String }, email: { type: String } }
```

**Route Handler Mapping**:
```
GET /users/:id → findById (MongooDB) or findOne (MySQL)
POST /users → create
PUT /users/:id → updateById
DELETE /users/:id → deleteById
```

### 4. Runtime Engine (runtime/RuntimeEngine.js)

**Responsibility**: Execute compiled configuration and run server

**Initialization Sequence**:

1. Load security middleware (Helmet, CORS)
2. Load basic middleware (JSON, logging)
3. Initialize database connections
4. Setup authentication system
5. Setup validation engine
6. Register routes
7. Setup protected route middleware
8. Setup error handling
9. Start Express server

**Key Features**:
- Express.js application setup
- Middleware orchestration
- Database initialization
- Route registration
- Protected route middleware
- Error handling

### 5. Core Modules (core/)

#### Database Manager (core/database.js)
- Manages multiple database connections
- Routes queries to appropriate adapter
- Provides unified query interface

#### Router Manager (core/router.js)
- Generates Express route handlers
- Handles CRUD operations
- Manages request/response flow
- Integrates validation

#### Validation Engine (core/validator.js)
- Loads validation rules
- Validates incoming data
- Returns structured errors

#### Auth Manager (core/auth.js)
- JWT token generation/verification
- Password hashing (bcryptjs)
- User authentication
- Protected route middleware

#### Logger (core/logger.js)
- Colored console output
- Multiple log levels
- Timestamp formatting

#### Middleware Factory (core/middleware.js)
- Rate limiting
- Request logging
- CORS configuration
- Request sanitization
- Error handling

### 6. Database Adapters (adapters/)

#### MongoDB Adapter (adapters/mongodb.js)
- Mongoose ORM integration
- Schema auto-generation
- Document-based queries
- Automatic timestamps

**Supported Operations**:
- findAll, findOne, findById
- create, updateById, deleteById
- delete (bulk)

#### MySQL Adapter (adapters/mysql.js)
- MySQL2 integration
- Connection pooling
- Automatic table creation
- SQL query building

**Supported Operations**:
- findAll, findOne, findById
- create, updateById, deleteById
- Raw SQL support

### 7. Configuration (config/)

**env.js**: Environment variable management
- Server settings
- JWT configuration
- Database URLs
- Security settings
- Debugging flags

## Data Flow Diagram

```
User DSL (app.easy)
        ↓
    Parser
        ├─ Tokenizer → Tokens
        └─ ASTBuilder → AST
                ↓
            Compiler
        ├─ Schema Generation
        ├─ Route Compilation
        └─ Config Building
                ↓
        RuntimeEngine
        ├─ Database Init
        ├─ Auth Setup
        ├─ Middleware Load
        └─ Route Register
                ↓
        Express Server
                ↓
          Client Requests
```

## Request Processing Pipeline

```
1. Client Request
         ↓
2. Express Router Match
         ↓
3. Security Middleware
   - Helmet headers
   - CORS check
   - Rate limiter
         ↓
4. Body Parser
   - JSON parsing
   - URL decoding
         ↓
5. Authentication
   - JWT verification (if protected)
         ↓
6. Request Validation
   - Schema validation
   - Input sanitization
         ↓
7. Route Handler
   - Database query
   - CRUD operation
         ↓
8. Response Formatter
   - Format to {success, data/error}
   - Add timestamps
         ↓
9. Send Response
         ↓
10. Client Response
```

## Error Handling Architecture

```
Error Occurrence
        ↓
   Caught by Handler
        ↓
   Validate Error Type
        ├─ Validation Error → 400
        ├─ Auth Error → 401/403
        ├─ Not Found → 404
        └─ Server Error → 500
        ↓
   Format Error Response
        ├─ success: false
        ├─ error: message
        └─ details: {...}
        ↓
   Send to Client
```

## Security Architecture

```
┌─────────────────────────────────┐
│     Security Layers              │
├─────────────────────────────────┤
│ 1. HTTPS/TLS (deployment layer) │
│ 2. Helmet.js Headers            │
│ 3. CORS Validation              │
│ 4. Rate Limiting                │
│ 5. Input Sanitization           │
│ 6. JWT Authentication           │
│ 7. Password Hashing             │
│ 8. SQL Parameterization         │
│ 9. Validation Rules             │
│ 10. Error Sanitization          │
└─────────────────────────────────┘
```

## Database Integration Architecture

```
Route Handler
     ↓
DatabaseManager
     ├─ MongoDB Adapter
     │  ├─ Mongoose Schema
     │  ├─ Connection Pool
     │  └─ Timestamp Handling
     │
     └─ MySQL Adapter
        ├─ Table Creation
        ├─ Connection Pool
        └─ Query Building
```

## Configuration Flow

```
.env File
   ↓
config/env.js
   ├─ Parse environment variables
   ├─ Set defaults
   └─ Validate requirements
      ↓
RuntimeEngine
   ├─ Pass config values
   ├─ Initialize services
   └─ Setup server
```

## Middleware Execution Order

```
1. helmet() - Security headers
2. cors() - CORS handling
3. compression() - Gzip compression
4. express.json() - Body parsing
5. Request Logging - Log incoming requests
6. Route Handlers - Process request
7. Protected Route Auth - JWT validation
8. Validation - Input validation
9. Error Handler - Catch errors
10. 404 Handler - Handle unknown routes
```

## Authentication Flow

```
User Registration
├─ POST /register
├─ Hash password (bcryptjs)
├─ Store in database
├─ Generate JWT token
└─ Return token

User Login
├─ POST /login
├─ Find user by email
├─ Compare password
├─ Generate JWT token
└─ Return token

Protected Request
├─ Client sends: Authorization: Bearer <token>
├─ JWT Middleware validates token
├─ Extract userId from token
├─ Attach to req.user
├─ Process request
└─ Return response
```

## Validation Flow

```
Request Data
     ↓
Load Validation Rules
     ↓
Validate Each Field
├─ Check required
├─ Check format (email, url, phone)
├─ Check length (min, max)
├─ Check type (numeric, alphanumeric)
└─ Check custom rules
     ↓
Collect Errors
     ↓
Return Validation Result
├─ Valid → Continue
└─ Invalid → Return 400 with details
```

## Performance Considerations

### 1. Connection Pooling
- MySQL: Connection pool (10 connections default)
- MongoDB: Connection pooling built-in

### 2. Caching
- Optional Redis integration
- Response caching support

### 3. Compression
- Gzip compression enabled
- Reduce payload size

### 4. Rate Limiting
- 100 requests per 15 minutes per IP
- Prevent abuse

### 5. Query Optimization
- Parameterized queries
- Lean MongoDB queries
- Field selection

## Scalability Features

1. **Horizontal Scaling**
   - Stateless design
   - External session storage ready
   - Redis support for caching

2. **Load Balancing**
   - No sticky sessions required
   - Can run multiple instances

3. **Database Scaling**
   - MongoDB sharding support
   - MySQL replication ready

4. **Monitoring**
   - Request logging
   - Error tracking
   - Performance metrics

## Extension Points

1. **Custom Middleware**
```javascript
// Add via USE clause
USE CUSTOM_MIDDLEWARE
```

2. **Custom Validators**
```javascript
// Extend validation rules
VALIDATE users {
  custom: custom_rule
}
```

3. **Database Adapters**
```javascript
// Add PostgreSQL, DynamoDB, etc.
// Create new adapter following pattern
```

4. **Authentication Methods**
```javascript
// OAuth, API Key, etc.
// Extend auth manager
```

---

This architecture ensures easy.js is:
- **Modular**: Each component has single responsibility
- **Extensible**: Easy to add features
- **Secure**: Multiple security layers
- **Performant**: Optimized data flow
- **Maintainable**: Clear separation of concerns
