const admin = require('firebase-admin');
const Logger = require('../core/logger');

class FirebaseAdapter {
  constructor() {
    this.db = null;
    this.connected = false;
  }

  async connect(config, models) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(config.credentials),
          databaseURL: config.databaseURL
        });
      }

      this.db = admin.firestore();
      this.connected = true;
      Logger.success('Firebase Firestore connected');

      // Initialize collections
      for (const model of models) {
        await this.db.collection(model.name).doc('_init').set({}, { merge: true });
        Logger.info(`Collection initialized: ${model.name}`);
      }
    } catch (error) {
      Logger.error('Firebase connection error: ' + error.message);
      throw error;
    }
  }

  async query(model, operation, data = null, options = {}) {
    if (!this.connected) throw new Error('Firebase not connected');

    try {
      switch (operation) {
        case 'findOne':
          return await this.findOne(model, data);
        case 'findMany':
          return await this.findMany(model, data, options);
        case 'create':
          return await this.create(model, data);
        case 'update':
          return await this.update(model, data);
        case 'delete':
          return await this.delete(model, data);
        case 'count':
          return await this.count(model, data);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      Logger.error(`Query error: ${error.message}`);
      throw error;
    }
  }

  async findOne(model, query) {
    const [key, value] = Object.entries(query)[0];
    const snapshot = await this.db
      .collection(model)
      .where(key, '==', value)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  async findMany(model, query = {}, options = {}) {
    let ref = this.db.collection(model);

    if (query && Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        ref = ref.where(key, '==', value);
      }
    }

    if (options.sort) {
      ref = ref.orderBy(options.sort);
    }

    if (options.limit) {
      ref = ref.limit(options.limit);
    }

    if (options.skip) {
      ref = ref.offset(options.skip);
    }

    const snapshot = await ref.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async create(model, data) {
    const docRef = await this.db.collection(model).add({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });

    return { id: docRef.id, ...data };
  }

  async update(model, data) {
    const { id, ...updateData } = data;
    await this.db.collection(model).doc(id).update({
      ...updateData,
      updated_at: new Date()
    });

    return { id, ...updateData };
  }

  async delete(model, query) {
    const [key, value] = Object.entries(query)[0];
    const snapshot = await this.db
      .collection(model)
      .where(key, '==', value)
      .get();

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }

    return { deleted: snapshot.size };
  }

  async count(model, query = {}) {
    let ref = this.db.collection(model);

    if (query && Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        ref = ref.where(key, '==', value);
      }
    }

    const snapshot = await ref.get();
    return snapshot.size;
  }

  async transaction(callback) {
    return await this.db.runTransaction(async (transaction) => {
      return await callback(transaction);
    });
  }

  async healthCheck() {
    await this.db.collection('_easyjs_health').limit(1).get();
    return { status: 'connected' };
  }

  async close() {
    this.connected = false;
  }
}

module.exports = FirebaseAdapter;
