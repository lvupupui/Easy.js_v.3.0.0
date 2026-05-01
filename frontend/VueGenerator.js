const fs = require('fs');
const path = require('path');

class VueGenerator {
  constructor() {
    this.config = null;
    this.models = null;
  }

  initialize(config, models) {
    this.config = config;
    this.models = models;
  }

  generateProjectStructure(projectPath) {
    const dirs = [
      'src/pages',
      'src/components',
      'src/composables',
      'src/api',
      'src/stores',
      'src/styles'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(projectPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generateVueComponent(modelName, fields) {
    const fieldInputs = fields.map(field => {
      return `
      <div class="form-group">
        <label for="${field.name}">${field.label || field.name}</label>
        <input
          type="${this.getInputType(field.type)}"
          id="${field.name}"
          v-model="form.${field.name}"
          placeholder="Enter ${field.name}"
          ${field.required ? ':required="true"' : ''}
        />
      </div>`;
    }).join('\n');

    return `<template>
  <div class="form-container">
    <h2>Create ${modelName}</h2>
    <form @submit.prevent="handleSubmit">
      ${fieldInputs}
      <button type="submit" :disabled="loading">
        {{ loading ? 'Creating...' : 'Create' }}
      </button>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api/client';

const form = ref({});
const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.post('/${modelName.toLowerCase()}', form.value);
    emit('success', response.data);
    form.value = {};
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

defineEmits(['success']);
</script>

<style scoped>
.form-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>`;
  }

  generateVueComposable() {
    return `import { ref, computed } from 'vue';
import api from '../api/client';

export function useAuth() {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('authToken', token);
      user.value = userData;
      return { success: true, user: userData };
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    user.value = null;
  };

  const register = async (userData) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user: newUser } = response.data;
      localStorage.setItem('authToken', token);
      user.value = newUser;
      return { success: true, user: newUser };
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const isAuthenticated = computed(() => !!user.value);

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated
  };
}`;
  }

  generateVueStore() {
    return `import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';

export const useAppStore = defineStore('app', () => {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchItems = async (modelName) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get(\`/\${modelName.toLowerCase()}\`);
      items.value = response.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching items:', err);
    } finally {
      loading.value = false;
    }
  };

  const addItem = (item) => {
    items.value.push(item);
  };

  const removeItem = (id) => {
    items.value = items.value.filter(item => item._id !== id && item.id !== id);
  };

  return {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    removeItem
  };
});`;
  }

  generateVueApiClient() {
    return `import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

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
    console.log('[Vue Generator] Generating Vue components...');
    
    this.generateProjectStructure(projectPath);

    // Generate components for each model
    if (this.models) {
      this.models.forEach(model => {
        const component = this.generateVueComponent(model.name, model.fields);
        fs.writeFileSync(
          path.join(projectPath, `src/components/${model.name}Form.vue`),
          component
        );
      });
    }

    // Generate composables
    fs.writeFileSync(
      path.join(projectPath, 'src/composables/useAuth.js'),
      this.generateVueComposable()
    );

    // Generate store
    fs.writeFileSync(
      path.join(projectPath, 'src/stores/app.js'),
      this.generateVueStore()
    );

    // Generate API client
    fs.writeFileSync(
      path.join(projectPath, 'src/api/client.js'),
      this.generateVueApiClient()
    );

    console.log('[Vue Generator] Vue components generated successfully!');
  }
}

module.exports = VueGenerator;
