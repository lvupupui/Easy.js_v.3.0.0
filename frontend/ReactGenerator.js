const fs = require('fs');
const path = require('path');

class ReactGenerator {
  constructor() {
    this.config = null;
    this.models = null;
    this.routes = null;
  }

  initialize(config, models, routes) {
    this.config = config;
    this.models = models;
    this.routes = routes;
  }

  generateProjectStructure(projectPath) {
    const dirs = [
      'src/pages',
      'src/components',
      'src/hooks',
      'src/api',
      'src/store',
      'src/styles',
      'public'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(projectPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generatePackageJson(projectPath, frameworkName) {
    const packageJson = {
      name: frameworkName.toLowerCase(),
      version: '1.0.0',
      description: 'Auto-generated full-stack application',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        lint: 'eslint src'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        axios: '^1.5.0',
        zustand: '^4.4.1',
        'react-router-dom': '^6.16.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.1.0',
        vite: '^5.0.0',
        eslint: '^8.52.0'
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  generateMainApp() {
    return `import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Routes auto-generated from DSL */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;`;
  }

  generateComponentForm(modelName, fields) {
    const fieldInputs = fields.map(field => {
      return `
      <div className="form-group">
        <label htmlFor="${field.name}">${field.label || field.name}</label>
        <input
          type="${this.getInputType(field.type)}"
          id="${field.name}"
          name="${field.name}"
          placeholder="Enter ${field.name}"
          required={${field.required || false}}
          onChange={(e) => setFormData({...formData, ${field.name}: e.target.value})}
        />
      </div>`;
    }).join('\n');

    return `import React, { useState } from 'react';
import api from '../api/client';
import '../styles/form.css';

export function ${modelName}Form({ onSuccess }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/${modelName.toLowerCase()}', formData);
      onSuccess(response.data);
      setFormData({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h2>Create ${modelName}</h2>
      ${fieldInputs}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}`;
  }

  generateComponentTable(modelName, fields) {
    const tableHeaders = fields.map(f => `<th>${f.label || f.name}</th>`).join('\n');
    const tableRows = fields.map(f => `<td>{item.${f.name}}</td>`).join('\n');

    return `import React, { useState, useEffect } from 'react';
import api from '../api/client';
import '../styles/table.css';

export function ${modelName}Table() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/${modelName.toLowerCase()}');
      setItems(response.data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          ${tableHeaders}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item._id || item.id}>
            ${tableRows}
            <td>
              <button onClick={() => handleDelete(item._id || item.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}`;
  }

  generateApiClient() {
    return `import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;`;
  }

  generateAuthHook() {
    return `import { useState, useCallback } from 'react';
import api from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setUser(null);
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated: !!user
  };
}`;
  }

  getInputType(fieldType) {
    const typeMap = {
      string: 'text',
      email: 'email',
      password: 'password',
      number: 'number',
      date: 'date',
      boolean: 'checkbox'
    };
    return typeMap[fieldType] || 'text';
  }

  generateAll(projectPath) {
    console.log('[React Generator] Generating React components...');
    
    this.generateProjectStructure(projectPath);
    this.generatePackageJson(projectPath, 'easy-app');

    // Generate main app
    fs.writeFileSync(
      path.join(projectPath, 'src/App.jsx'),
      this.generateMainApp()
    );

    // Generate components for each model
    if (this.models) {
      this.models.forEach(model => {
        const form = this.generateComponentForm(model.name, model.fields);
        const table = this.generateComponentTable(model.name, model.fields);

        fs.writeFileSync(
          path.join(projectPath, `src/components/${model.name}Form.jsx`),
          form
        );

        fs.writeFileSync(
          path.join(projectPath, `src/components/${model.name}Table.jsx`),
          table
        );
      });
    }

    // Generate API client
    fs.writeFileSync(
      path.join(projectPath, 'src/api/client.js'),
      this.generateApiClient()
    );

    // Generate auth hook
    fs.writeFileSync(
      path.join(projectPath, 'src/hooks/useAuth.js'),
      this.generateAuthHook()
    );

    console.log('[React Generator] React components generated successfully!');
  }
}

module.exports = ReactGenerator;
