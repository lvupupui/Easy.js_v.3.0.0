/**
 * Example Models
 * These are used by CRUD generators, forms, and admin dashboard
 */

const models = {
  users: {
    name: 'users',
    table: 'users',
    fields: {
      id: 'integer',
      email: 'email',
      password: 'password',
      name: 'string',
      phone: 'phone',
      avatar_url: 'url',
      role: 'string', // user, admin, moderator
      verified: 'boolean',
      active: 'boolean',
      created_at: 'datetime',
      updated_at: 'datetime'
    },
    relations: {
      posts: 'hasMany',
      comments: 'hasMany',
      apiKeys: 'hasMany'
    }
  },

  posts: {
    name: 'posts',
    table: 'posts',
    fields: {
      id: 'integer',
      user_id: 'integer',
      title: 'string',
      slug: 'string',
      content: 'text',
      excerpt: 'string',
      featured_image: 'url',
      published: 'boolean',
      views: 'integer',
      likes: 'integer',
      created_at: 'datetime',
      updated_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users',
      comments: 'hasMany',
      tags: 'belongsToMany'
    }
  },

  comments: {
    name: 'comments',
    table: 'comments',
    fields: {
      id: 'integer',
      post_id: 'integer',
      user_id: 'integer',
      content: 'text',
      approved: 'boolean',
      created_at: 'datetime',
      updated_at: 'datetime'
    },
    relations: {
      post: 'belongsTo:posts',
      user: 'belongsTo:users'
    }
  },

  apiKeys: {
    name: 'api_keys',
    table: 'api_keys',
    fields: {
      id: 'integer',
      key: 'string',
      name: 'string',
      user_id: 'integer',
      last_used: 'datetime',
      active: 'boolean',
      created_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users'
    }
  },

  transactions: {
    name: 'transactions',
    table: 'transactions',
    fields: {
      id: 'uuid',
      user_id: 'integer',
      amount: 'number',
      currency: 'string',
      status: 'string', // pending, completed, failed
      payment_method: 'string',
      stripe_charge_id: 'string',
      description: 'text',
      metadata: 'json',
      created_at: 'datetime',
      updated_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users'
    }
  },

  subscriptions: {
    name: 'subscriptions',
    table: 'subscriptions',
    fields: {
      id: 'uuid',
      user_id: 'integer',
      stripe_subscription_id: 'string',
      plan: 'string', // free, basic, pro, enterprise
      status: 'string', // active, paused, cancelled
      current_period_start: 'datetime',
      current_period_end: 'datetime',
      next_billing_date: 'datetime',
      cancel_at: 'datetime',
      created_at: 'datetime',
      updated_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users'
    }
  },

  notifications: {
    name: 'notifications',
    table: 'notifications',
    fields: {
      id: 'uuid',
      user_id: 'integer',
      type: 'string', // email, sms, push, in_app
      title: 'string',
      message: 'text',
      read: 'boolean',
      read_at: 'datetime',
      created_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users'
    }
  },

  auditLogs: {
    name: 'audit_logs',
    table: 'audit_logs',
    fields: {
      id: 'uuid',
      user_id: 'integer',
      action: 'string',
      resource_type: 'string',
      resource_id: 'string',
      before: 'json',
      after: 'json',
      ip_address: 'string',
      user_agent: 'string',
      status: 'string', // success, failed
      error: 'text',
      created_at: 'datetime'
    },
    relations: {
      user: 'belongsTo:users'
    }
  }
};

module.exports = models;
