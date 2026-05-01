# Security Defaults

easy.js should make the safe path the easy path.

## Recommended Defaults

Use this in new apps:

```easy
SECURITY strict
```

Strict projects should use:

- Helmet security headers
- CORS configuration
- JSON body size limits
- Rate limiting
- Input validation
- JWT auth
- Refresh-token rotation
- Password reset tokens
- Email verification tokens
- Role-based access checks
- API key middleware when needed
- Audit logging
- Health and readiness checks

## Secrets

Never ship production with generated placeholder secrets.

Required production secrets:

```text
JWT_SECRET
JWT_REFRESH_SECRET
FIELD_ENCRYPTION_KEY
DATABASE_URL
```

Run:

```bash
easyjs doctor
```

before deploying.
