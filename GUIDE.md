# easy.js Complete Developer Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [DSL Syntax Reference](#dsl-syntax-reference)
3. [Advanced Features](#advanced-features)
4. [Database Integration](#database-integration)
5. [Security Implementation](#security-implementation)
6. [Performance Optimization](#performance-optimization)
7. [Real-World Examples](#real-world-examples)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn
- MongoDB or MySQL (optional, for data persistence)

### Installation

```bash
# Global installation
npm install -g easy.js

# Or use npx
npx easy.js --version
```

### First Application

1. Create a new project:
```bash
easyjs create my-blog-api
cd my-blog-api
npm install
```

2. Edit `src/app.easy`:
```
START SERVER 3000
USE MONGODB mongodb://localhost:27017/myblog

MODEL users {
  username: string
  email: string
  password: string
}

GET /users FROM users
POST /users FROM users

VALIDATE users {
  email: required:email
  password: required:min=6
}
```

3. Start the server:
```bash
npm start
```

4. Test the API:
```bash
curl http://localhost:3000/users
```

## DSL Syntax Reference

### Complete Syntax Guide

#### 1. Server Configuration

```
START SERVER <port>
```

- `port` must be a number (1024-65535)
- Default: 3000

Examples:
```
START SERVER 3000
START SERVER 8080
START SERVER 5000
```

#### 2. Database Configuration

**MongoDB:**
```
USE MONGODB <connection_string>
```

**MySQL:**
```
USE MYSQL <connection_string>
```

Connection string formats:
```
mongodb://localhost:27017/dbname
mongodb://user:password@host:port/dbname
mongodb+srv://user:password@cluster.mongodb.net/dbname

mysql://user:password@localhost:3306/dbname
mysql://root:root@192.168.1.100:3306/myapp
```

#### 3. Model Definition

```
MODEL <model_name> {
  field1: type
  field2: type
  field3: type
}
```

Supported types:
- `string` - Text data
- `number` - Integer or decimal
- `boolean` - True/False
- `date` - Date and time
- `object` - JSON object
- `array` - List of items

Example:
```
MODEL products {
  name: string
  price: number
  inStock: boolean
  createdAt: date
  tags: array
  metadata: object
}
```

#### 4. Route Definition

```
<METHOD> <path> FROM <model>
```

Methods: GET, POST, PUT, DELETE, PATCH

Path patterns:
- `/users` - Get all, create
- `/users/:id` - Get one, update, delete
- `/users/:userId/posts` - Nested routes
- `/search` - Custom endpoints

Example:
```
GET /users FROM users
GET /users/:id FROM users
POST /users FROM users
PUT /users/:id FROM users
DELETE /users/:id FROM users
PATCH /users/:id FROM users
```

#### 5. Authentication

```
AUTH <model> BY jwt
```

Enables JWT-based authentication:
```
AUTH users BY jwt
```

This automatically:
- Hashes passwords with bcryptjs
- Generates JWT tokens on login
- Validates tokens on protected routes

#### 6. Route Protection

```
PROTECT <path>
PROTECT <path>
```

Requires valid JWT token:
```
PROTECT /users
PROTECT /posts
PROTECT /admin
```

#### 7. Validation Rules

```
VALIDATE <model> {
  field: rule1:rule2:rule3
  field: rule1:param=value
}
```

Available rules:
- `required` - Field mandatory
- `email` - Email validation
- `min=N` - Minimum (length or value)
- `max=N` - Maximum (length or value)
- `numeric` - Numbers only
- `alphanumeric` - Letters and numbers
- `url` - URL validation
- `phone` - Phone number validation
- `unique` - Unique value (in collection)

Examples:
```
VALIDATE users {
  email: required:email
  password: required:min=8:max=128
  username: required:min=3:max=20:alphanumeric
  age: numeric:min=18:max=120
  website: url
  phone: phone
  name: required:min=2:max=50
}
```

#### 8. Middleware

```
USE <middleware>
```

Built-in middleware:
- `LOGGER` - Request logging
- `AUTH` - Authentication
- `CORS` - Cross-origin support
- `COMPRESSION` - Gzip compression
- `RATELIMIT` - Rate limiting

Example:
```
USE LOGGER
USE CORS
USE COMPRESSION
USE RATELIMIT
```

## Advanced Features

### Multiple Databases

```
USE MONGODB mongodb://localhost:27017/users
USE MYSQL mysql://root:root@localhost:3306/logs
```

### Complex Validation

```
VALIDATE orders {
  email: required:email
  quantity: required:numeric:min=1:max=1000
  price: required:numeric:min=0
  status: required
  shippingAddress: required:min=10
}
```

### Nested Routes

```
GET /users/:userId/posts FROM posts
POST /users/:userId/posts FROM posts
GET /users/:userId/posts/:postId FROM posts
DELETE /users/:userId/posts/:postId FROM posts
```

### Complete API Example

```
START SERVER 4000

USE MONGODB mongodb://localhost:27017/ecommerce

MODEL users {
  name: string
  email: string
  password: string
  role: string
  createdAt: date
}

MODEL products {
  name: string
  description: string
  price: number
  stock: number
  category: string
}

MODEL orders {
  userId: string
  products: array
  total: number
  status: string
  createdAt: date
}

AUTH users BY jwt

GET /users FROM users
POST /users FROM users
PUT /users/:id FROM users

GET /products FROM products
GET /products/:id FROM products
POST /products FROM products

GET /orders FROM orders
POST /orders FROM orders
GET /orders/:id FROM orders

VALIDATE users {
  email: required:email
  password: required:min=6
  name: required
}

VALIDATE products {
  name: required:min=3
  price: required:numeric:min=0
  stock: numeric:min=0
}

VALIDATE orders {
  userId: required
  products: required
  total: required:numeric:min=0
}

PROTECT /users
PROTECT /orders
PROTECT /products
```

## Database Integration

### MongoDB Configuration

```
USE MONGODB mongodb://localhost:27017/myapp
```

Features:
- Automatic document validation
- Flexible schema
- Timestamps (createdAt, updatedAt)
- Indexing support

Connection string examples:
```
mongodb://localhost:27017/dev
mongodb://user:password@localhost:27017/production
mongodb+srv://user:password@cluster.mongodb.net/myapp
```

### MySQL Configuration

```
USE MYSQL mysql://root:password@localhost:3306/myapp
```

Features:
- Automatic table creation
- Connection pooling
- Transaction support
- Prepared statements

Connection string:
```
mysql://username:password@host:port/database
```

### Querying Data

GET endpoints automatically handle:
- List all: `GET /resource`
- Find one: `GET /resource/:id`
- Query parameters: `GET /resource?limit=10&skip=20`

## Security Implementation

### JWT Authentication

1. Enable authentication:
```
AUTH users BY jwt
```

2. Protect routes:
```
PROTECT /api/users
PROTECT /api/posts
```

3. Access token in client:
```javascript
// Login
const response = await fetch('/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();

// Use token
const data = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Password Security

Passwords are automatically:
- Hashed with bcryptjs (10 rounds)
- Never stored in plain text
- Validated on login

### Input Validation

Validate all inputs:
```
VALIDATE users {
  email: required:email
  password: required:min=8
  age: numeric:min=18
}
```

Validation errors returned:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": ["email must be a valid email"],
    "password": ["password must be at least 8 characters"]
  }
}
```

### Security Headers

Automatically enabled via Helmet:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy

### CORS Configuration

Configured via environment:
```
CORS_ORIGIN=https://example.com
```

Or allow all:
```
CORS_ORIGIN=*
```

### Rate Limiting

Automatic rate limiting:
- 100 requests per 15 minutes per IP
- Configurable via environment

```
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Performance Optimization

### Indexing (MongoDB)

Models with email fields auto-indexed.

### Connection Pooling (MySQL)

Automatic connection pooling for efficiency.

### Response Compression

Gzip compression enabled by default.

### Caching Strategy

- Cache headers set automatically
- Redis support (optional)

### Query Optimization

- Parameterized queries prevent SQL injection
- Lean queries for MongoDB
- Field selection support

## Real-World Examples

### Blog API

```
START SERVER 3000
USE MONGODB mongodb://localhost:27017/blog

MODEL users {
  username: string
  email: string
  password: string
  bio: string
}

MODEL posts {
  title: string
  content: string
  author: string
  published: boolean
  views: number
  createdAt: date
}

MODEL comments {
  postId: string
  author: string
  text: string
  createdAt: date
}

AUTH users BY jwt

GET /users FROM users
POST /users FROM users
PUT /users/:id FROM users

GET /posts FROM posts
GET /posts/:id FROM posts
POST /posts FROM posts
PUT /posts/:id FROM posts
DELETE /posts/:id FROM posts

GET /posts/:postId/comments FROM comments
POST /posts/:postId/comments FROM comments
DELETE /comments/:id FROM comments

VALIDATE users {
  username: required:min=3:max=20
  email: required:email
  password: required:min=8
  bio: max=500
}

VALIDATE posts {
  title: required:min=3:max=200
  content: required:min=10
  author: required
}

VALIDATE comments {
  text: required:min=1:max=1000
  author: required
  postId: required
}

PROTECT /posts
PROTECT /comments
PROTECT /users
```

### E-commerce API

```
START SERVER 4000
USE MYSQL mysql://root:password@localhost:3306/store

MODEL customers {
  email: string
  name: string
  phone: string
  address: string
  city: string
  country: string
}

MODEL products {
  name: string
  description: string
  price: number
  stock: number
  sku: string
}

MODEL orders {
  customerId: string
  total: number
  status: string
  shippingAddress: string
}

AUTH customers BY jwt

GET /customers FROM customers
POST /customers FROM customers

GET /products FROM products
GET /products/:id FROM products

GET /orders FROM orders
POST /orders FROM orders
GET /orders/:id FROM orders

VALIDATE customers {
  email: required:email
  name: required:min=2
  phone: required:phone
  address: required
}

VALIDATE products {
  name: required
  price: required:numeric:min=0
  stock: numeric:min=0
}

PROTECT /customers
PROTECT /orders
```

## Troubleshooting

### Issue: "Port already in use"
```bash
# Use different port
easyjs start app.easy --port 3001
```

### Issue: "MongoDB connection failed"

Check:
1. MongoDB service running: `sudo systemctl status mongod`
2. Connection string format
3. Network accessibility
4. Credentials

### Issue: "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: "Validation not working"

Ensure:
1. VALIDATE block matches MODEL name exactly
2. Rules are properly formatted
3. Restart server

### Issue: "JWT token invalid"

Check:
1. Token format: `Authorization: Bearer <token>`
2. JWT_SECRET environment variable
3. Token expiration

### Debug Mode

Enable detailed logging:
```
DEBUG=true node index.js
```

### Check Framework Version

```bash
easyjs --version
```

---

For more help, check the main README.md or open an issue on GitHub.
