# Security Policy

Maintainer: Avi Ranjan Prasad

## Supported Versions

Security fixes are prioritized for the latest major version of easy.js.

| Version | Supported |
| --- | --- |
| 3.x | Yes |
| < 3.0 | No |

## Reporting a Vulnerability

Please do not publicly disclose security issues before a fix is available.

Report vulnerabilities through the repository security advisory flow or by opening a minimal private report with:

- Affected version
- Reproduction steps
- Impact
- Suggested fix, if known

## Security Expectations

easy.js aims to make secure defaults easy:

- `SECURITY strict`
- request validation
- protected routes
- refresh-token rotation
- API-key hashing
- webhook signature verification
- generated-code security rules

Users must still replace generated placeholder secrets before production.
