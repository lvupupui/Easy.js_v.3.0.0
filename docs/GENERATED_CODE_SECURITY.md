# Generated Code Security Model

Author: Avi Ranjan Prasad

easy.js generated code follows these rules:

- Generated routes must validate request input when validation rules exist.
- Protected paths must require authentication.
- Strict security mode must enable secure headers and request limits.
- Secrets must come from environment variables.
- Generated code must not embed production credentials.
- Webhooks must support signature verification.
- API keys must be hashed before storage.
- Audit events should avoid logging raw secrets or passwords.
