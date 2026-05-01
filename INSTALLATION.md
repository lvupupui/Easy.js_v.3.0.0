# easy.js Installation & Setup Guide

## Prerequisites

Before installing easy.js, ensure you have:

- **Node.js**: Version 14.0.0 or higher
  - Check: `node --version`
  - Download: https://nodejs.org/

- **npm or yarn**: Comes with Node.js
  - Check: `npm --version` or `yarn --version`

- **Git** (optional): For version control
  - Download: https://git-scm.com/

## Installation Methods

### Method 1: Global Installation (Recommended)

Install easy.js globally to use the CLI from anywhere:

```bash
npm install -g easy.js
```

Verify installation:
```bash
easyjs --version
```

Now use from any directory:
```bash
easyjs create my-api
cd my-api
npm install
npm start
```

### Method 2: Local Installation

Install in specific project:

```bash
npm install easy.js
```

Use via npx:
```bash
npx easyjs create my-api
```

### Method 3: From Source

Clone and develop:

```bash
git clone https://github.com/easy-js/easy.js.git
cd easy.js
npm install
npm link  # Creates global symlink

easyjs create my-api
```

## Quick Start

### 1. Create a New Project

```bash
easyjs create my-first-api
cd my-first-api
```

This creates:
```
my-first-api/
├── src/
│   └── app.easy
├── .env
├── package.json
└── README.md
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

Edit `.env`:
```
MONGODB_URL=mongodb://localhost:27017/my_api
JWT_SECRET=your-secret-key-here
```

Or for MySQL:
```
MYSQL_URL=mysql://root:password@localhost:3306/my_api
```

### 4. Start Development Server

```bash
npm run dev
```

Or production:
```bash
npm start
```

Server runs on `http://localhost:3000`

## Database Setup

### MongoDB Setup

#### Local Installation

**macOS** (with Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian**:
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

**Windows**:
- Download MSI installer: https://www.mongodb.com/try/download/community
- Run installer and follow wizard
- Connect: `mongosh`

#### MongoDB Atlas (Cloud)

1. Visit https://www.mongodb.com/cloud/atlas
2. Create account and login
3. Create cluster (free tier available)
4. Get connection string
5. Update `.env`:
```
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname
```

### MySQL Setup

#### Local Installation

**macOS** (with Homebrew):
```bash
brew install mysql
brew services start mysql
mysql_secure_installation  # Set root password
```

**Ubuntu/Debian**:
```bash
sudo apt-get install mysql-server
sudo mysql_secure_installation
sudo systemctl start mysql
```

**Windows**:
- Download installer: https://dev.mysql.com/downloads/mysql/
- Run installer and follow wizard
- Create database:
```sql
CREATE DATABASE my_api;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON my_api.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

#### MySQL Cloud Hosting

- **AWS RDS**: https://aws.amazon.com/rds/mysql/
- **DigitalOcean**: https://www.digitalocean.com/products/managed-databases/
- **Heroku**: https://elements.heroku.com/addons/cleardb

Update `.env` with cloud connection string.

## Environment Configuration

### Create .env File

```bash
cp .env.example .env
```

### Configuration Variables

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Security
JWT_SECRET=generate-secure-random-string
JWT_EXPIRY=24h

# Database
MONGODB_URL=mongodb://localhost:27017/easyjs
MYSQL_URL=mysql://user:pass@localhost:3306/easyjs

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Debugging
DEBUG=false
```

### Generate JWT Secret

Secure random string (32+ characters):

```bash
# macOS/Linux
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Verify Installation

Create a test app:

```bash
easyjs create test-app
cd test-app
npm install
```

Run tests:
```bash
npm test
```

Or start server:
```bash
npm start
```

Visit: `http://localhost:3000`

## Troubleshooting

### Command Not Found

If `easyjs` command not found:

```bash
# Check npm global location
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH=$PATH:$(npm config get prefix)/bin

# Or reinstall
npm uninstall -g easy.js
npm install -g easy.js
```

### Port Already in Use

```bash
# Use different port
PORT=3001 npm start

# Or kill existing process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

### Database Connection Failed

Check connection string:
```bash
# MongoDB test
mongosh "mongodb://localhost:27017"

# MySQL test
mysql -u root -p
```

### Missing Dependencies

```bash
# Clean reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

### Permission Denied

```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

## Next Steps

1. **Read the guide**: `cat GUIDE.md`
2. **Check examples**: `ls examples/`
3. **Create your first API**: See README.md
4. **Deploy to production**: See deployment guide

## Uninstall

```bash
npm uninstall -g easy.js
```

## Updating

Update to latest version:

```bash
npm update -g easy.js
```

Check for updates:
```bash
npm outdated -g easy.js
```

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|------------|
| Node.js | 14.0.0 | 18.0.0+ |
| RAM | 512MB | 2GB+ |
| Disk | 100MB | 500MB+ |
| CPU | 1 Core | 2+ Cores |

## Supported Operating Systems

- macOS 10.12+
- Ubuntu 16.04+
- Debian 9+
- Windows 7+
- Linux (any distribution)

## Docker Installation

Use Docker for isolated environment:

```dockerfile
FROM node:18-alpine

WORKDIR /app
RUN npm install -g easy.js

EXPOSE 3000

ENTRYPOINT ["easyjs"]
CMD ["start", "app.easy"]
```

Build and run:
```bash
docker build -t easy-app .
docker run -p 3000:3000 easy-app
```

## WSL (Windows Subsystem for Linux)

Install on WSL:

```bash
# Update WSL
wsl --update

# Install Node.js in WSL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install easy.js
npm install -g easy.js
```

## IDE Setup

### Visual Studio Code

Install extensions:
1. **JavaScript (ES6) code snippets** - charalampos karypidis
2. **REST Client** - Huachao Mao
3. **ES7+ React/Redux/React-Native snippets** - dsznajder

Create `.vscode/settings.json`:
```json
{
  "files.exclude": {
    "node_modules": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### WebStorm

- File → Settings → Languages & Frameworks → JavaScript
- Select Node.js runtime
- Enable ESLint

## Next Steps After Installation

1. Create your first project
2. Configure database
3. Define models and routes
4. Test API endpoints
5. Deploy to production

For detailed tutorials, see GUIDE.md and examples directory.

---

Installation complete! Happy coding with easy.js.
