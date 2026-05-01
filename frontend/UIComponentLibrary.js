const fs = require('fs');
const path = require('path');

class UIComponentLibrary {
  constructor(framework = 'react', cssFramework = 'tailwind') {
    this.framework = framework;
    this.cssFramework = cssFramework;
    this.components = {};
  }

  generateButton() {
    if (this.framework === 'react') {
      return `import React from 'react';
import PropTypes from 'prop-types';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  ...props
}) {
  const baseClasses = 'font-semibold rounded transition-colors cursor-pointer';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    success: 'bg-green-500 text-white hover:bg-green-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const className = \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${disabledClasses}\`;

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};`;
    } else if (this.framework === 'vue') {
      return `<template>
  <button
    :class="[baseClasses, variantClasses[variant], sizeClasses[size], disabledClasses]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: String,
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'danger'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const baseClasses = 'font-semibold rounded transition-colors cursor-pointer';

const variantClasses = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600',
  secondary: 'bg-gray-500 text-white hover:bg-gray-600',
  success: 'bg-green-500 text-white hover:bg-green-600',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const disabledClasses = computed(() => props.disabled ? 'opacity-50 cursor-not-allowed' : '');
</script>`;
    }
  }

  generateCard() {
    if (this.framework === 'react') {
      return `import React from 'react';

export function Card({ title, children, footer, onClick }) {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      <div className="mb-4">{children}</div>
      {footer && <div className="pt-4 border-t">{footer}</div>}
    </div>
  );
}`;
    } else if (this.framework === 'vue') {
      return `<template>
  <div
    class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
    @click="$emit('click')"
  >
    <h2 v-if="title" class="text-xl font-bold mb-4">{{ title }}</h2>
    <div class="mb-4">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="pt-4 border-t">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
});

defineEmits(['click']);
</script>`;
    }
  }

  generateForm() {
    if (this.framework === 'react') {
      return `import React, { useState } from 'react';
import { Button } from './Button';

export function Form({ fields, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="w-full p-2 border rounded"
              required={field.required}
            />
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="w-full p-2 border rounded"
              required={field.required}
            />
          )}
          {errors[field.name] && <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>}
        </div>
      ))}
      {errors.submit && <div className="text-red-500">{errors.submit}</div>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}`;
    } else if (this.framework === 'vue') {
      return `<template>
  <form @submit.prevent="handleSubmit" class="space-y-4 max-w-md">
    <div v-for="field in fields" :key="field.name">
      <label class="block text-sm font-medium mb-1">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>
      <textarea
        v-if="field.type === 'textarea'"
        v-model="formData[field.name]"
        :placeholder="field.placeholder"
        class="w-full p-2 border rounded"
        :required="field.required"
      />
      <input
        v-else
        :type="field.type"
        v-model="formData[field.name]"
        :placeholder="field.placeholder"
        class="w-full p-2 border rounded"
        :required="field.required"
      />
      <p v-if="errors[field.name]" class="text-red-500 text-sm mt-1">
        {{ errors[field.name] }}
      </p>
    </div>
    <div v-if="errors.submit" class="text-red-500">{{ errors.submit }}</div>
    <Button type="submit" :disabled="loading">
      {{ loading ? 'Submitting...' : 'Submit' }}
    </Button>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import Button from './Button.vue';

const props = defineProps({
  fields: Array,
  onSubmit: Function,
});

const formData = reactive({});
const errors = reactive({});
const loading = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  try {
    await props.onSubmit(formData);
  } catch (error) {
    errors.submit = error.message;
  } finally {
    loading.value = false;
  }
};
</script>`;
    }
  }

  generateTable() {
    if (this.framework === 'react') {
      return `import React from 'react';

export function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="border border-gray-300 p-3 text-left font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={col.key} className="border border-gray-300 p-3">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;
    } else if (this.framework === 'vue') {
      return `<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="border border-gray-300 p-3 text-left font-semibold"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in data"
          :key="idx"
          class="hover:bg-gray-50 cursor-pointer"
          @click="$emit('row-click', row)"
        >
          <td v-for="col in columns" :key="col.key" class="border border-gray-300 p-3">
            {{ row[col.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  columns: Array,
  data: Array,
});

defineEmits(['row-click']);
</script>`;
    }
  }

  generateModal() {
    if (this.framework === 'react') {
      return `import React from 'react';

export function Modal({ isOpen, title, children, onClose, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="mb-4">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}`;
    }
  }

  generateAlert() {
    if (this.framework === 'react') {
      return `import React from 'react';

export function Alert({ type = 'info', title, message, onClose }) {
  const bgColors = {
    success: 'bg-green-50 border-green-500',
    error: 'bg-red-50 border-red-500',
    warning: 'bg-yellow-50 border-yellow-500',
    info: 'bg-blue-50 border-blue-500',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div className={\`border-l-4 p-4 \${bgColors[type]}\`}>
      <div className="flex justify-between items-start">
        <div>
          {title && <h3 className={\`font-bold \${textColors[type]}\`}>{title}</h3>}
          <p className={textColors[type]}>{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500">✕</button>
        )}
      </div>
    </div>
  );
}`;
    }
  }

  generateAllComponents(projectPath) {
    console.log('[UI Library] Generating component library...');

    const componentsPath = path.join(projectPath, 'frontend/src/components/ui');
    if (!fs.existsSync(componentsPath)) {
      fs.mkdirSync(componentsPath, { recursive: true });
    }

    const ext = this.framework === 'react' ? 'jsx' : 'vue';

    fs.writeFileSync(path.join(componentsPath, `Button.${ext}`), this.generateButton());
    fs.writeFileSync(path.join(componentsPath, `Card.${ext}`), this.generateCard());
    fs.writeFileSync(path.join(componentsPath, `Form.${ext}`), this.generateForm());
    fs.writeFileSync(path.join(componentsPath, `Table.${ext}`), this.generateTable());
    fs.writeFileSync(path.join(componentsPath, `Modal.${ext}`), this.generateModal());
    fs.writeFileSync(path.join(componentsPath, `Alert.${ext}`), this.generateAlert());

    console.log('[UI Library] Component library generated successfully!');
  }
}

module.exports = UIComponentLibrary;
