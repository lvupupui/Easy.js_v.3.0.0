const loggerWinston = require('../core/loggerWinston');

class FormGenerator {
  static generateFormFromModel(model) {
    const form = {
      id: `form-${model.name}`,
      name: model.name,
      title: `${model.name} Form`,
      fields: []
    };

    if (model.fields) {
      Object.entries(model.fields).forEach(([fieldName, fieldType]) => {
        form.fields.push(
          this.generateField(fieldName, fieldType, model)
        );
      });
    }

    return form;
  }

  static generateField(name, type, model) {
    const baseField = {
      name,
      label: this.formatLabel(name),
      placeholder: `Enter ${this.formatLabel(name).toLowerCase()}`,
      required: !name.startsWith('optional_'),
      validation: this.getValidation(type)
    };

    const typeMap = {
      string: { type: 'text', maxLength: 255 },
      email: { type: 'email' },
      phone: { type: 'tel', pattern: '[0-9+-]{10,}' },
      number: { type: 'number' },
      integer: { type: 'number', step: 1 },
      boolean: { type: 'checkbox' },
      date: { type: 'date' },
      datetime: { type: 'datetime-local' },
      text: { type: 'textarea', rows: 5 },
      json: { type: 'textarea', rows: 5 },
      uuid: { type: 'text', readOnly: true },
      password: { type: 'password' },
      url: { type: 'url' }
    };

    return {
      ...baseField,
      ...(typeMap[type] || typeMap.string)
    };
  }

  static getValidation(type) {
    const validations = {
      string: { minLength: 1, maxLength: 255 },
      email: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      phone: { pattern: '^[0-9+\\-\\s()]{10,}$' },
      number: { type: 'number' },
      integer: { type: 'integer' },
      url: { pattern: '^https?://.+' },
      date: { type: 'date' },
      datetime: { type: 'datetime-local' }
    };

    return validations[type] || {};
  }

  static formatLabel(fieldName) {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  static generateFormHTML(form) {
    let html = `
<form id="${form.id}" method="POST">
  <h2>${form.title}</h2>
  <div class="form-fields">
`;

    form.fields.forEach(field => {
      html += this.generateFieldHTML(field);
    });

    html += `
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save</button>
      <button type="reset" class="btn btn-secondary">Clear</button>
    </div>
  </div>
</form>
<style>
  form { max-width: 600px; margin: 0 auto; }
  .form-fields { display: flex; flex-direction: column; gap: 20px; }
  .form-group { display: flex; flex-direction: column; }
  label { font-weight: bold; margin-bottom: 5px; }
  input, textarea, select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #007bff; box-shadow: 0 0 5px #007bff; }
  .form-actions { display: flex; gap: 10px; }
  button { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
  .btn-primary { background: #007bff; color: white; }
  .btn-secondary { background: #6c757d; color: white; }
</style>
`;

    return html;
  }

  static generateFieldHTML(field) {
    let input = '';

    switch (field.type) {
      case 'textarea':
        input = `<textarea name="${field.name}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} rows="${field.rows || 5}"></textarea>`;
        break;
      case 'checkbox':
        input = `<input type="checkbox" name="${field.name}" id="${field.name}" />`;
        break;
      case 'select':
        input = `<select name="${field.name}" ${field.required ? 'required' : ''}>${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`;
        break;
      default:
        input = `<input type="${field.type}" name="${field.name}" placeholder="${field.placeholder}" ${field.maxLength ? `maxlength="${field.maxLength}"` : ''} ${field.required ? 'required' : ''} ${field.pattern ? `pattern="${field.pattern}"` : ''} />`;
    }

    return `
    <div class="form-group">
      <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
      ${input}
    </div>
`;
  }

  static generateValidation(form) {
    const validation = {};

    form.fields.forEach(field => {
      const rules = {};

      if (field.required) {
        rules.required = true;
      }

      if (field.validation) {
        Object.assign(rules, field.validation);
      }

      if (field.type === 'email') {
        rules.email = true;
      } else if (field.type === 'url') {
        rules.url = true;
      } else if (field.type === 'number') {
        rules.number = true;
      } else if (field.type === 'date') {
        rules.date = true;
      }

      validation[field.name] = rules;
    });

    return validation;
  }
}

class CRUDGenerator {
  static validatePayload(model, data, partial = false) {
    const errors = [];
    const fields = model.fields || {};

    for (const [field, type] of Object.entries(fields)) {
      const value = data[field];
      if (!partial && value === undefined && !field.startsWith('optional_')) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value === undefined || value === null) continue;

      if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} must be a valid email`);
      }
      if ((type === 'number' || type === 'integer') && Number.isNaN(Number(value))) {
        errors.push(`${field} must be a number`);
      }
      if (type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static generateCRUDRoutes(model, db) {
    return {
      /**
       * CREATE
       */
      create: async (data) => {
        const validation = CRUDGenerator.validatePayload(model, data);
        if (!validation.valid) {
          const error = new Error('Validation failed');
          error.statusCode = 400;
          error.details = validation.errors;
          throw error;
        }
        const record = await db.query(model.name, 'create', data);
        loggerWinston.info(`Created ${model.name}`, { id: record.id });
        return record;
      },

      /**
       * READ
       */
      read: async (id) => {
        const record = await db.query(model.name, 'findOne', { id });
        if (!record) {
          throw new Error(`${model.name} not found`);
        }
        return record;
      },

      /**
       * READ ALL
       */
      readAll: async (options = {}) => {
        return db.query(model.name, 'findMany', {}, options);
      },

      /**
       * UPDATE
       */
      update: async (id, data) => {
        const validation = CRUDGenerator.validatePayload(model, data, true);
        if (!validation.valid) {
          const error = new Error('Validation failed');
          error.statusCode = 400;
          error.details = validation.errors;
          throw error;
        }
        const record = await db.query(model.name, 'update', { id, ...data });
        loggerWinston.info(`Updated ${model.name}`, { id });
        return record;
      },

      /**
       * DELETE
       */
      delete: async (id) => {
        await db.query(model.name, 'delete', { id });
        loggerWinston.info(`Deleted ${model.name}`, { id });
        return { success: true };
      }
    };
  }

  static generateExpressRoutes(model, db) {
    const crud = this.generateCRUDRoutes(model, db);
    const router = require('express').Router();
    const modelPath = `/api/${model.name.toLowerCase()}`;

    /**
     * GET /api/model - List all
     */
    router.get(modelPath, async (req, res, next) => {
      try {
        const { limit = 10, skip = 0 } = req.query;
        const records = await crud.readAll({ limit: parseInt(limit), skip: parseInt(skip) });
        res.json({ success: true, data: records });
      } catch (error) {
        next(error);
      }
    });

    /**
     * POST /api/model - Create
     */
    router.post(modelPath, async (req, res, next) => {
      try {
        const record = await crud.create(req.body);
        res.status(201).json({ success: true, data: record });
      } catch (error) {
        next(error);
      }
    });

    /**
     * GET /api/model/:id - Read
     */
    router.get(`${modelPath}/:id`, async (req, res, next) => {
      try {
        const record = await crud.read(req.params.id);
        res.json({ success: true, data: record });
      } catch (error) {
        next(error);
      }
    });

    /**
     * PUT /api/model/:id - Update
     */
    router.put(`${modelPath}/:id`, async (req, res, next) => {
      try {
        const record = await crud.update(req.params.id, req.body);
        res.json({ success: true, data: record });
      } catch (error) {
        next(error);
      }
    });

    /**
     * DELETE /api/model/:id - Delete
     */
    router.delete(`${modelPath}/:id`, async (req, res, next) => {
      try {
        await crud.delete(req.params.id);
        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

module.exports = { FormGenerator, CRUDGenerator };
