const fs = require('fs');
const path = require('path');

class CSSFrameworkSupport {
  constructor() {
    this.frameworks = {
      tailwind: 'Tailwind CSS',
      bootstrap: 'Bootstrap',
      material: 'Material UI',
      semantic: 'Semantic UI',
      bulma: 'Bulma',
      pico: 'Pico CSS'
    };
    this.selectedFramework = 'tailwind';
  }

  setFramework(framework) {
    if (!this.frameworks[framework]) {
      throw new Error(`Unsupported CSS framework: ${framework}`);
    }
    this.selectedFramework = framework;
    console.log(`[CSS Support] Selected framework: ${this.frameworks[framework]}`);
  }

  generateTailwindConfig() {
    return `module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          900: '#0c2d6b',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#a78bfa',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}`;
  }

  generateTailwindCSS() {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
  }

  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500;
  }

  .label {
    @apply block text-sm font-medium text-gray-700 mb-2;
  }
}`;
  }

  generateBootstrapConfig() {
    return `// Bootstrap configuration
// Custom theme variables can be defined here
$primary: #0ea5e9;
$secondary: #a78bfa;
$success: #10b981;
$danger: #ef4444;
$warning: #f59e0b;
$info: #3b82f6;

// Import Bootstrap
@import '../../node_modules/bootstrap/scss/bootstrap';

// Custom components
.card {
  @extend .card;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
}`;
  }

  generateMaterialUITheme() {
    return `import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    secondary: {
      main: '#a78bfa',
      light: '#c4b5fd',
      dark: '#8b5cf6',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
  },
});`;
  }

  generateComponentWithFramework(componentName, framework) {
    const generators = {
      tailwind: () => this.generateTailwindComponent(componentName),
      bootstrap: () => this.generateBootstrapComponent(componentName),
      material: () => this.generateMaterialComponent(componentName),
    };

    return generators[framework]?.() || generators.tailwind();
  }

  generateTailwindComponent(name) {
    return `import React from 'react';

export function ${name}() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">${name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Component */}
          <div className="card bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Feature 1</h2>
            <p className="text-gray-600 mb-4">Description of feature</p>
            <button className="btn-primary px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Learn More
            </button>
          </div>

          {/* Form Component */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Form</h2>
            <form className="space-y-4">
              <div>
                <label className="label text-sm font-medium text-gray-700 block mb-2">Email</label>
                <input
                  type="email"
                  className="input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}`;
  }

  generateBootstrapComponent(name) {
    return `import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export function ${name}() {
  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        <h1 className="display-4 fw-bold mb-4 text-dark">${name}</h1>

        <div className="row g-4">
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Bootstrap Feature</h5>
                <p className="card-text">Use Bootstrap classes for styling</p>
                <button className="btn btn-primary">Learn More</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`;
  }

  generateMaterialComponent(name) {
    return `import React from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
} from '@mui/material';

export function ${name}() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        ${name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Material UI Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Professional Material Design components
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" variant="contained">
                Learn More
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contact Form
            </Typography>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              variant="outlined"
            />
            <Button variant="contained" fullWidth sx={{ mt: 2 }}>
              Submit
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}`;
  }

  generateCSSFile(framework = this.selectedFramework) {
    const cssGenerators = {
      tailwind: () => this.generateTailwindCSS(),
      bootstrap: () => this.generateBootstrapConfig(),
      material: () => this.generateMaterialUITheme(),
    };

    return cssGenerators[framework]?.() || this.generateTailwindCSS();
  }

  generateConfigFile(framework = this.selectedFramework) {
    const configGenerators = {
      tailwind: () => this.generateTailwindConfig(),
      bootstrap: () => 'Bootstrap uses CSS directly from CDN or node_modules',
      material: () => this.generateMaterialUITheme(),
    };

    return configGenerators[framework]?.() || this.generateTailwindConfig();
  }
}

module.exports = CSSFrameworkSupport;
