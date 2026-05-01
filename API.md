# easy.js API Documentation

## API Response Format

All responses follow a standard format:

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "field": "value",
    ...
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "fieldName": ["error message"],
    "otherField": ["error 1", "error 2"]
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Authentication

### Login Endpoint

```
POST /login
```

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

### Using Authentication

Include token in Authorization header:

```
Authorization: Bearer <token>
```

Example:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." http://localhost:3000/users
```

### Token Refresh

Tokens expire based on JWT_EXPIRY setting (default: 24h)

## CRUD Operations

### Create (POST)

```
POST /<resource>
```

Request:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "123",
    "field1": "value1",
    "field2": "value2",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Read (GET)

Get all records:
```
GET /<resource>
```

Response (200):
```json
{
  "success": true,
  "data": [
    { "id": "1", "field": "value" },
    { "id": "2", "field": "value" }
  ]
}
```

Get single record:
```
GET /<resource>/:id
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "123",
    "field": "value"
  }
}
```

### Update (PUT/PATCH)

```
PUT /<resource>/:id
PATCH /<resource>/:id
```

Request:
```json
{
  "field1": "new value"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "123",
    "field1": "new value",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  }
}
```

### Delete (DELETE)

```
DELETE /<resource>/:id
```

Response (204): Empty body

## Query Parameters

### Pagination

```
GET /users?limit=10&skip=20
```

- `limit` - Number of records to return (default: 100)
- `skip` - Number of records to skip (default: 0)

### Filtering

```
GET /users?filter={email:"test@example.com"}
```

### Sorting

```
GET /users?sort=-createdAt
```

- Prefix with `-` for descending order
- Prefix with `+` or no prefix for ascending order

## Error Handling

### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": ["email must be a valid email"],
    "password": ["password must be at least 6 characters"]
  }
}
```

### Not Found

```json
{
  "success": false,
  "error": "Resource not found",
  "path": "/users/999"
}
```

### Unauthorized

```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

### Rate Limited

```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

## Common Endpoints

Based on DSL declarations, these endpoints are automatically created:

### User Management

```
GET /users              - List all users
GET /users/:id          - Get specific user
POST /users             - Create new user
PUT /users/:id          - Update user
DELETE /users/:id       - Delete user
PATCH /users/:id        - Partially update user
```

### Resource Management

```
GET /posts              - List all posts
POST /posts             - Create post
PUT /posts/:id          - Update post
DELETE /posts/:id       - Delete post
```

## Example Requests

### Create User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get All Users

```bash
curl http://localhost:3000/users
```

### Get Specific User

```bash
curl http://localhost:3000/users/507f1f77bcf86cd799439011
```

### Update User

```bash
curl -X PUT http://localhost:3000/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "name": "Jane Doe"
  }'
```

### Delete User

```bash
curl -X DELETE http://localhost:3000/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJ..."
```

## Headers

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Response Headers

```
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Access-Control-Allow-Origin: *
```

## Rate Limiting

Default rate limits:
- 100 requests per 15 minutes per IP

Configurable via environment:
```
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

Headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110400
```

## CORS

CORS is enabled by default for all origins.

Configure via environment:
```
CORS_ORIGIN=https://example.com
```

Or allow multiple origins:
```
CORS_ORIGIN=https://example.com,https://app.example.com
```

## Timestamps

Automatically added to all resources:
- `createdAt` - When record was created
- `updatedAt` - When record was last updated

Format: ISO 8601 (e.g., `2024-01-01T12:00:00.000Z`)

## Pagination Example

```bash
# Get first 10 users
curl "http://localhost:3000/users?limit=10"

# Get next 10 users
curl "http://localhost:3000/users?limit=10&skip=10"

# Get specific page (assuming 20 per page)
curl "http://localhost:3000/users?limit=20&skip=$((($PAGE-1)*20))"
```

## Bulk Operations

Currently not implemented. Use individual requests or:
- Use database CLI tools for bulk operations
- Implement custom endpoints if needed

## Batch Requests

Send multiple operations in one request:

```bash
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '[
    { "method": "POST", "path": "/users", "data": { "name": "User 1" } },
    { "method": "POST", "path": "/users", "data": { "name": "User 2" } }
  ]'
```

## GraphQL

GraphQL support available via extension:
```
easyjs install graphql-adapter
```

## REST API Best Practices

1. **Use meaningful HTTP methods**
   - GET for retrieving
   - POST for creating
   - PUT/PATCH for updating
   - DELETE for removing

2. **Use proper status codes**
   - 200 for success
   - 201 for creation
   - 400 for validation errors
   - 401 for auth errors
   - 404 for not found

3. **Include timestamps**
   - createdAt, updatedAt automatically added
   - Use for auditing and sorting

4. **Validate inputs**
   - Use VALIDATE blocks
   - Return clear error messages
   - Check email, password, required fields

5. **Secure sensitive data**
   - Use PROTECT for sensitive endpoints
   - Implement JWT authentication
   - Hash passwords automatically

## Webhook Support

Webhooks can be implemented via custom middleware:

```javascript
// Custom implementation
router.post('/webhooks/users', (req, res) => {
  // Handle webhook
  res.json({ success: true });
});
```

---

For more information, check the main README.md and GUIDE.md
