# Publishing easy.js to npm

## Pre-Publication Checklist

- [x] Code is production-ready
- [x] All tests pass
- [x] Documentation is complete
- [x] README.md is comprehensive
- [x] package.json is properly configured
- [x] License is included
- [x] .npmignore is configured
- [x] Version number is set
- [x] Changelog is documented

## Files to Include

### Required Files
- `index.js` - Main entry point
- `package.json` - Package metadata
- `README.md` - Documentation
- `LICENSE` - MIT license

### Core Directories
- `cli/` - Command-line interface
- `parser/` - DSL parser
- `compiler/` - Compiler module
- `runtime/` - Runtime engine
- `core/` - Core modules
- `adapters/` - Database adapters
- `config/` - Configuration files
- `examples/` - Example applications

## Setup npm Account

1. Create account at https://www.npmjs.com/
2. Verify email
3. Setup two-factor authentication (2FA)
4. Login locally:

```bash
npm login
```

Enter:
- Username
- Password
- Email address
- OTP code (if 2FA enabled)

## Version Management

### Current Version
```bash
npm version
# Returns: { 'easy.js': '1.0.0' }
```

### Update Version

**Patch release** (1.0.0 → 1.0.1):
```bash
npm version patch
```

**Minor release** (1.0.0 → 1.1.0):
```bash
npm version minor
```

**Major release** (1.0.0 → 2.0.0):
```bash
npm version major
```

## Pre-Publish Testing

### Dry Run
```bash
npm publish --dry-run
```

Shows what would be published without actually publishing.

### Local Testing
```bash
npm pack
# Creates easy.js-1.0.0.tgz

# Test in another directory
mkdir test
cd test
npm install ../easy.js-1.0.0.tgz
```

### Verify Installation
```bash
npm list easy.js
node_modules/.bin/easyjs --version
```

## Publish to npm

### First Time Publication

```bash
npm publish
```

This will:
1. Validate package.json
2. Run prepublishOnly scripts
3. Compress files
4. Upload to npm registry
5. Show confirmation

### Subsequent Publications

Same command, but version must be incremented first:

```bash
npm version patch
npm publish
```

## After Publication

### Verify Publication

Check npm registry:
```bash
npm view easy.js

# Full details
npm info easy.js

# Download stats
npm stats easy.js
```

### Release Announcement

Add to CHANGELOG.md:
```
## [1.0.0] - 2024-01-01

### Added
- Initial release
- DSL parser and compiler
- MongoDB and MySQL support
- JWT authentication
- Input validation
- CLI tool
- Comprehensive documentation

### Installation
```bash
npm install easy.js
```

### Features
- Simple DSL syntax
- Auto-generated Express.js backend
- Built-in security
- Database support
```

## GitHub Release

1. Create Git tag:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

2. Create GitHub Release:
- Go to Releases → New Release
- Select tag
- Add description
- Publish

## Package Manager Links

After publishing:
- **npm**: https://www.npmjs.com/package/easy.js
- **npm CDN**: https://unpkg.com/easy.js/
- **Yarn**: `yarn add easy.js`
- **pnpm**: `pnpm add easy.js`

## Maintenance

### Update Package

```bash
# Make changes
vim index.js

# Bump version
npm version minor

# Publish
npm publish

# Tag release
git tag -a v1.1.0 -m "Version 1.1.0"
git push --tags
```

### Deprecate Version

```bash
npm deprecate easy.js@1.0.0 "Use 2.0.0 instead"
```

### Unpublish (Within 72 hours)

```bash
npm unpublish easy.js@1.0.0
# or entire package
npm unpublish easy.js -f
```

## Monitoring

### Download Stats

```bash
# Last day
npm stats easy.js

# Over time
curl https://api.npmjs.org/downloads/range/2024-01-01:2024-12-31/easy.js
```

### Package Page

Updates automatically at: https://www.npmjs.com/package/easy.js

## Continuous Integration

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup npm Token

1. Go to Account Settings → Tokens
2. Create Automation token
3. Add to GitHub Secrets:
   - Go to Settings → Secrets
   - Add `NPM_TOKEN`

## Distribution Strategy

### Recommended Strategy

1. **Development**: Publish beta versions
```bash
npm version 1.1.0-beta.1
npm publish --tag beta
npm dist-tag add easy.js@1.1.0-beta.1 beta
```

2. **Release Candidate**: Test before stable
```bash
npm version 1.1.0-rc.1
npm publish --tag rc
```

3. **Stable**: Main release
```bash
npm version 1.1.0
npm publish
npm dist-tag add easy.js@1.1.0 latest
```

### Installing Versions

```bash
# Latest stable
npm install easy.js

# Latest beta
npm install easy.js@beta

# Specific version
npm install easy.js@1.0.0

# Latest major version
npm install easy.js@^1.0.0
```

## SEO & Discoverability

### package.json Keywords

Already includes:
- backend
- framework
- dsl
- express
- mongodb
- mysql
- api

### package.json Metadata

- `description`: Brief explanation
- `keywords`: Search terms
- `author`: Your name
- `license`: MIT
- `repository`: GitHub URL
- `bugs`: Issue tracker
- `homepage`: Website

## License Verification

Publish with MIT License:

```
MIT License

Copyright (c) 2024 easy.js

Permission is hereby granted, free of charge...
```

## Support Resources

### Documentation Links in npm

Add to package.json:
```json
{
  "homepage": "https://easy.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/easy-js/easy.js"
  },
  "bugs": {
    "url": "https://github.com/easy-js/easy.js/issues"
  }
}
```

### Update Frequency

Recommended:
- Bug fixes: Patch version, publish immediately
- Features: Minor version, monthly releases
- Breaking changes: Major version, quarterly reviews

## Future Versions

### 2.0.0 Roadmap
- [ ] GraphQL support
- [ ] WebSocket integration
- [ ] File upload handling
- [ ] Email integration
- [ ] Payment processing
- [ ] OAuth/OpenID Connect
- [ ] Advanced caching strategies
- [ ] Microservices support

### Beta Release Process
```bash
npm publish --tag beta
npm dist-tag add easy.js@2.0.0-beta.1 beta
```

## Troubleshooting

### Already Published Version

```
This version is already published

Solution: npm version patch
```

### npm ERR! Invalid Package

```
Check:
- package.json syntax
- All required fields present
- Valid author/license
- No restricted package name
```

### Authentication Failed

```bash
npm logout
npm login
npm publish
```

### Too Large Package

Reduce size by:
- Removing node_modules from package
- Excluding test files (use .npmignore)
- Minifying code (optional)

```
# Create .npmignore
examples/
test/
*.test.js
.env.example
GUIDE.md
ARCHITECTURE.md
```

## Congratulations!

easy.js is now available to millions of developers worldwide!

### Share the news:
- Tweet: "#easyjs - A production-ready backend framework with simple DSL syntax"
- Post on dev.to
- Share in communities
- Update profile/portfolio

### Next Steps:
1. Monitor downloads
2. Respond to issues
3. Accept pull requests
4. Plan future versions
5. Build community

---

**Happy publishing!** 🚀
