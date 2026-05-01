const express = require('express');
const loggerWinston = require('../core/loggerWinston');

class AdminDashboardGenerator {
  constructor(db, models) {
    this.db = db;
    this.models = models || [];
    this.router = express.Router();
  }

  generate() {
    // Auth middleware
    this.router.use(this.authenticateAdmin.bind(this));

    // Dashboard routes
    this.router.get('/', this.renderDashboard.bind(this));
    this.router.get('/api/stats', this.getStats.bind(this));
    this.router.get('/api/models', this.getModels.bind(this));
    this.router.get('/api/settings', this.getSettings.bind(this));
    this.router.put('/api/settings', this.updateSettings.bind(this));
    this.router.get('/api/audit-logs', this.getAuditLogs.bind(this));
    
    // Model-specific routes
    this.models.forEach(model => {
      const modelName = model.name.toLowerCase();
      
      // List
      this.router.get(`/${modelName}`, this.listRecords.bind(this));
      this.router.get(`/${modelName}/api`, this.getRecordsAPI.bind(this));
      
      // View
      this.router.get(`/${modelName}/:id`, this.viewRecord.bind(this));
      this.router.get(`/${modelName}/:id/api`, this.getRecordAPI.bind(this));
      
      // Create
      this.router.post(`/${modelName}/api`, this.createRecord.bind(this));
      
      // Update
      this.router.put(`/${modelName}/:id/api`, this.updateRecord.bind(this));
      
      // Delete
      this.router.delete(`/${modelName}/:id/api`, this.deleteRecord.bind(this));
    });

    loggerWinston.info('Admin dashboard generated with routes');
    return this.router;
  }

  authenticateAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
  }

  renderDashboard(req, res) {
    const html = this.generateDashboardHTML();
    res.type('html').send(html);
  }

  async getStats(req, res) {
    try {
      const stats = {
        totalModels: this.models.length,
        models: []
      };

      for (const model of this.models) {
        const count = await this.db.query(model.name, 'count', {});
        stats.models.push({
          name: model.name,
          count: count
        });
      }

      res.json(stats);
    } catch (error) {
      loggerWinston.error('Failed to get stats', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  async getModels(req, res) {
    const models = this.models.map(m => ({
      name: m.name,
      fields: m.fields || {}
    }));
    res.json(models);
  }

  async getSettings(req, res) {
    res.json({
      appName: process.env.APP_NAME || 'easy.js',
      environment: process.env.NODE_ENV || 'development',
      features: {
        swagger: true,
        healthChecks: true,
        admin: true
      }
    });
  }

  async updateSettings(req, res) {
    loggerWinston.info('Admin settings update requested', {
      user: req.user?.id,
      keys: Object.keys(req.body || {})
    });
    res.json({
      success: true,
      message: 'Settings update accepted. Persist through your configured settings adapter.'
    });
  }

  async getAuditLogs(req, res) {
    const compliance = req.app.get('compliance');
    if (compliance && compliance.auditEvents) {
      return res.json(compliance.auditEvents.slice(-100));
    }
    res.json([]);
  }

  async listRecords(req, res) {
    const { model } = req.params;
    const html = this.generateListHTML(model);
    res.type('html').send(html);
  }

  async getRecordsAPI(req, res) {
    try {
      const { model } = req.params;
      const { limit = 10, skip = 0, search } = req.query;

      const records = await this.db.query(
        model,
        'findMany',
        search ? { name: search } : {},
        { limit: parseInt(limit), skip: parseInt(skip) }
      );

      const total = await this.db.query(model, 'count', {});

      res.json({
        data: records,
        pagination: { limit: parseInt(limit), skip: parseInt(skip), total }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async viewRecord(req, res) {
    const { model, id } = req.params;
    const html = this.generateDetailHTML(model, id);
    res.type('html').send(html);
  }

  async getRecordAPI(req, res) {
    try {
      const { model, id } = req.params;
      const record = await this.db.query(model, 'findOne', { id });

      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createRecord(req, res) {
    try {
      const { model } = req.params;
      const record = await this.db.query(model, 'create', req.body);

      loggerWinston.info(`Record created in ${model}`, { id: record.id });
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateRecord(req, res) {
    try {
      const { model, id } = req.params;
      const updated = await this.db.query(model, 'update', { id, ...req.body });

      loggerWinston.info(`Record updated in ${model}`, { id });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteRecord(req, res) {
    try {
      const { model, id } = req.params;
      await this.db.query(model, 'delete', { id });

      loggerWinston.info(`Record deleted from ${model}`, { id });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>easy.js Admin Dashboard</title>
  <style>${this.getDashboardCSS()}</style>
</head>
<body>
  <div class="admin-container">
    <aside class="sidebar">
      <h2>Admin Dashboard</h2>
      <nav id="models-nav"></nav>
    </aside>
    <main class="content">
      <header class="header">
        <h1 id="page-title">Dashboard</h1>
        <div class="user-info">
          <span id="user-name">Admin</span>
          <a href="/logout">Logout</a>
        </div>
      </header>
      <section id="content-area">
        <div id="stats" class="stats-grid"></div>
      </section>
    </main>
  </div>
  <script>${this.getDashboardJS()}</script>
</body>
</html>
    `;
  }

  generateListHTML(model) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Manage ${model}</title>
  <style>${this.getDashboardCSS()}</style>
</head>
<body>
  <div class="admin-container">
    <table id="records-table">
      <thead><tr><th>ID</th><th>Actions</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <script>
    const model = '${model}';
    fetch(\`/api/models\`).then(r => r.json()).then(data => {
      const m = data.find(x => x.name === model);
      if (m) {
        const headers = ['ID', ...Object.keys(m.fields)];
        document.querySelector('thead tr').innerHTML = 
          headers.map(h => '<th>' + h + '</th>').join('') + '<th>Actions</th>';
      }
    });
  </script>
</body>
</html>
    `;
  }

  generateDetailHTML(model, id) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Edit ${model}</title>
  <style>${this.getDashboardCSS()}</style>
</head>
<body>
  <div class="admin-container">
    <form id="record-form"></form>
  </div>
  <script>
    const model = '${model}';
    const id = '${id}';
    fetch(\`/api/\${model}/\${id}\`).then(r => r.json()).then(record => {
      document.getElementById('record-form').innerHTML = 
        Object.entries(record).map(([k, v]) => 
          '<div><label>' + k + '</label><input name="' + k + '" value="' + v + '"></div>'
        ).join('');
    });
  </script>
</body>
</html>
    `;
  }

  getDashboardCSS() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
      .admin-container { display: flex; height: 100vh; }
      .sidebar { width: 250px; background: #2c3e50; color: white; padding: 20px; overflow-y: auto; }
      .sidebar h2 { margin-bottom: 20px; }
      .sidebar nav a { display: block; padding: 10px; color: white; text-decoration: none; border-radius: 4px; margin-bottom: 5px; }
      .sidebar nav a:hover { background: #34495e; }
      .content { flex: 1; display: flex; flex-direction: column; }
      .header { background: white; padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
      #content-area { padding: 20px; overflow-y: auto; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
      .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .stat-card h3 { color: #7f8c8d; font-size: 14px; margin-bottom: 10px; }
      .stat-card .value { font-size: 32px; font-weight: bold; color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; background: white; }
      table th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
      table td { padding: 12px; border-bottom: 1px solid #eee; }
      form { background: white; padding: 20px; border-radius: 8px; max-width: 600px; }
      form div { margin-bottom: 15px; }
      form label { display: block; margin-bottom: 5px; font-weight: 500; }
      form input, form textarea, form select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    `;
  }

  getDashboardJS() {
    return `
      async function loadStats() {
        const stats = await fetch('/admin/api/stats').then(r => r.json());
        const html = stats.models.map(m => 
          '<div class="stat-card"><h3>' + m.name + '</h3><div class="value">' + m.count + '</div></div>'
        ).join('');
        document.getElementById('stats').innerHTML = html;
      }

      async function loadModels() {
        const models = await fetch('/admin/api/models').then(r => r.json());
        const nav = document.getElementById('models-nav');
        nav.innerHTML = models.map(m => 
          '<a href="/admin/' + m.name.toLowerCase() + '">' + m.name + '</a>'
        ).join('');
      }

      loadStats();
      loadModels();
    `;
  }
}

module.exports = AdminDashboardGenerator;
