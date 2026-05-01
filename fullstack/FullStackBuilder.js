const fs = require('fs');
const path = require('path');
const ReactGenerator = require('../frontend/ReactGenerator');
const VueGenerator = require('../frontend/VueGenerator');
const CSSFrameworkSupport = require('../frontend/CSSFrameworkSupport');
const MLEngine = require('../core/mlEngine');
const Parser = require('../parser/Parser');
const Compiler = require('../compiler/Compiler');

class FullStackBuilder {
  constructor() {
    this.config = null;
    this.reactGenerator = new ReactGenerator();
    this.vueGenerator = new VueGenerator();
    this.cssSupport = new CSSFrameworkSupport();
    this.mlEngine = new MLEngine();
    this.parser = new Parser();
    this.compiler = new Compiler();
  }

  async buildFullStack(dslContent, options = {}) {
    console.log('[FullStack Builder] Starting full-stack application generation...');

    const startTime = Date.now();

    try {
      // Parse DSL
      console.log('[FullStack Builder] Parsing DSL...');
      const ast = this.parser.parse(dslContent);

      // Compile to configuration
      console.log('[FullStack Builder] Compiling configuration...');
      const config = this.compiler.compile(ast);

      // Extract configuration
      const {
        frontend = 'react',
        cssFramework = 'tailwind',
        includeML = false,
        mlModels = [],
        projectName = 'easy-app',
        projectPath = process.cwd()
      } = options;

      // Create project structure
      console.log('[FullStack Builder] Creating project structure...');
      this.createProjectStructure(projectPath, projectName);

      // Generate backend
      console.log('[FullStack Builder] Generating backend code...');
      this.generateBackend(projectPath, config);

      // Generate frontend
      console.log('[FullStack Builder] Generating frontend code...');
      if (frontend === 'react') {
        this.reactGenerator.initialize(config, config.models, config.routes);
        this.reactGenerator.generateAll(path.join(projectPath, 'frontend'));
      } else if (frontend === 'vue') {
        this.vueGenerator.initialize(config, config.models);
        this.vueGenerator.generateAll(path.join(projectPath, 'frontend'));
      }

      // Setup CSS framework
      console.log('[FullStack Builder] Setting up CSS framework...');
      this.cssSupport.setFramework(cssFramework);
      this.generateCSSSetup(projectPath, cssFramework);

      // Generate ML components if needed
      if (includeML && mlModels.length > 0) {
        console.log('[FullStack Builder] Generating ML components...');
        await this.generateMLComponents(projectPath, mlModels, frontend);
      }

      // Generate Docker configuration
      console.log('[FullStack Builder] Generating Docker configuration...');
      this.generateDockerFiles(projectPath, projectName);

      // Generate CI/CD configuration
      console.log('[FullStack Builder] Generating CI/CD configuration...');
      this.generateCICD(projectPath);

      // Generate README
      console.log('[FullStack Builder] Generating documentation...');
      this.generateREADME(projectPath, projectName, { frontend, cssFramework, includeML });

      const duration = Date.now() - startTime;
      console.log(`[FullStack Builder] Full-stack application generated successfully! (${duration}ms)`);

      return {
        success: true,
        projectPath,
        projectName,
        frontend,
        cssFramework,
        includeML,
        duration,
        message: `Your full-stack application "${projectName}" is ready!`
      };
    } catch (err) {
      console.error('[FullStack Builder] Error:', err);
      throw err;
    }
  }

  createProjectStructure(basePath, projectName) {
    const projectPath = path.join(basePath, projectName);

    const directories = [
      'backend/src/routes',
      'backend/src/models',
      'backend/src/controllers',
      'backend/src/middleware',
      'backend/src/utils',
      'frontend/src/pages',
      'frontend/src/components',
      'frontend/src/api',
      'frontend/src/hooks',
      'frontend/src/stores',
      'frontend/src/styles',
      'frontend/public',
      'config',
      'docker',
      '.github/workflows'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(projectPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });

    return projectPath;
  }

  generateBackend(projectPath, config) {
    const backendPath = path.join(projectPath, 'backend');

    // Generate main server file
    const serverCode = `const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easy-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
// Auto-generated routes from DSL

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;

    fs.writeFileSync(path.join(backendPath, 'src/server.js'), serverCode);

    // Generate environment file
    const envContent = `MONGODB_URI=mongodb://localhost:27017/easy-app
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173`;

    fs.writeFileSync(path.join(backendPath, '.env.example'), envContent);
  }

  generateCSSSetup(projectPath, framework) {
    const frontendPath = path.join(projectPath, 'frontend');

    if (framework === 'tailwind') {
      const config = this.cssSupport.generateTailwindConfig();
      fs.writeFileSync(path.join(frontendPath, 'tailwind.config.js'), config);

      const css = this.cssSupport.generateTailwindCSS();
      fs.writeFileSync(path.join(frontendPath, 'src/styles/globals.css'), css);
    } else if (framework === 'bootstrap') {
      const config = this.cssSupport.generateBootstrapConfig();
      fs.writeFileSync(path.join(frontendPath, 'src/styles/bootstrap.scss'), config);
    } else if (framework === 'material') {
      const theme = this.cssSupport.generateMaterialUITheme();
      fs.writeFileSync(path.join(frontendPath, 'src/theme.js'), theme);
    }
  }

  async generateMLComponents(projectPath, mlModels, frontend) {
    const mlPath = path.join(projectPath, 'ml');
    if (!fs.existsSync(mlPath)) {
      fs.mkdirSync(mlPath, { recursive: true });
    }

    for (const model of mlModels) {
      const componentPath = path.join(projectPath, 'frontend/src/components');
      const component = await this.mlEngine.exportModelAsComponent(model.name, frontend === 'react' ? 'react' : 'vue');
      fs.writeFileSync(
        path.join(componentPath, `${model.name}Predictor.${frontend === 'react' ? 'jsx' : 'vue'}`),
        component
      );
    }

    // Generate ML server setup
    const mlServerCode = `const express = require('express');
const tf = require('@tensorflow/tfjs');
const MLEngine = require('./core/mlEngine');

const mlEngine = new MLEngine();

async function setupMLRoutes(app) {
  // Load models
  ${mlModels.map(m => `await mlEngine.loadModel('${m.name}', '${m.path}');`).join('\n  ')}

  // Generate prediction endpoints
  ${mlModels.map(m => `mlEngine.generatePredictionAPI('${m.name}', app);`).join('\n  ')}

  console.log('[ML Server] Routes configured');
}

module.exports = setupMLRoutes;`;

    fs.writeFileSync(path.join(projectPath, 'backend/src/ml-routes.js'), mlServerCode);
  }

  generateDockerFiles(projectPath, projectName) {
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build frontend if needed
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]`;

    fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://root:password@mongodb:27017/easy-app
      NODE_ENV: production
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  mongodb_data:`;

    fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  generateCICD(projectPath) {
    const githubWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run build:frontend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: echo "Deploying to production..."`;

    fs.writeFileSync(path.join(projectPath, '.github/workflows/ci-cd.yml'), githubWorkflow);
  }

  generateREADME(projectPath, projectName, options) {
    const readme = `# ${projectName}

Full-stack application generated by easy.js v3.0

## Features

- **Backend**: Express.js API with auto-generated routes
- **Frontend**: ${options.frontend === 'react' ? 'React' : 'Vue'} with auto-generated components
- **Styling**: ${options.cssFramework === 'tailwind' ? 'Tailwind CSS' : options.cssFramework === 'bootstrap' ? 'Bootstrap' : 'Material UI'}
- **Database**: MongoDB with auto-generated models
- **Authentication**: JWT-based authentication
${options.includeML ? '- **ML**: TensorFlow.js integration for predictions' : ''}

## Project Structure

\`\`\`
${projectName}/
├── backend/                 # Express.js server
├── frontend/               # ${options.frontend} application
├── ml/                     # ML models and components
├── docker-compose.yml      # Docker configuration
└── README.md              # This file
\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

\`\`\`bash
cd ${projectName}
npm install
\`\`\`

### Development

\`\`\`bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
\`\`\`

### Using Docker

\`\`\`bash
docker-compose up
\`\`\`

## API Documentation

All API endpoints are auto-generated from your DSL configuration.

## Deployment

The application is ready to deploy to:
- Vercel
- AWS (Lambda, EC2, ECS)
- Google Cloud
- DigitalOcean
- Traditional servers

---

Generated with easy.js v3.0 - The complete full-stack framework`;

    fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
  }
}

module.exports = FullStackBuilder;
