const fs = require('fs');
const path = require('path');
const optionalRequire = require('./optionalRequire');

function getTensorflow() {
  return optionalRequire('@tensorflow/tfjs', 'TensorFlow.js ML');
}

class MLEngine {
  constructor() {
    this.models = new Map();
    this.predictions = [];
    this.config = {};
  }

  async initialize(config) {
    this.config = config;
    console.log('[ML Engine] TensorFlow.js initialized');
  }

  async loadModel(modelName, modelPath) {
    try {
      const tf = getTensorflow();
      const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      this.models.set(modelName, model);
      console.log(`[ML Engine] Model loaded: ${modelName}`);
      return model;
    } catch (err) {
      console.error(`[ML Engine] Failed to load model ${modelName}:`, err);
      throw err;
    }
  }

  async createSimpleModel(inputShape, outputShape) {
    const tf = getTensorflow();
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 64, activation: 'relu', inputShape: [inputShape] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: outputShape, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async trainModel(modelName, trainingData, epochs = 10, batchSize = 32) {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    try {
      const tf = getTensorflow();
      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels);

      const history = await model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit: 0.2,
        verbose: 1
      });

      xs.dispose();
      ys.dispose();

      console.log(`[ML Engine] Model ${modelName} trained successfully`);
      return history;
    } catch (err) {
      console.error(`[ML Engine] Training failed for ${modelName}:`, err);
      throw err;
    }
  }

  async predict(modelName, inputData) {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    try {
      const tf = getTensorflow();
      const input = tf.tensor2d([inputData]);
      const prediction = model.predict(input);
      const result = await prediction.data();

      input.dispose();
      prediction.dispose();

      const output = Array.from(result);

      // Store prediction for monitoring
      this.predictions.push({
        model: modelName,
        input: inputData,
        output,
        timestamp: new Date(),
        confidence: Math.max(...output)
      });

      return {
        prediction: output,
        confidence: Math.max(...output),
        timestamp: new Date()
      };
    } catch (err) {
      console.error(`[ML Engine] Prediction failed for ${modelName}:`, err);
      throw err;
    }
  }

  async batchPredict(modelName, inputDataArray) {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    try {
      const tf = getTensorflow();
      const input = tf.tensor2d(inputDataArray);
      const predictions = model.predict(input);
      const results = await predictions.data();

      input.dispose();
      predictions.dispose();

      return Array.from(results).reduce((acc, val, idx) => {
        if (idx % inputDataArray[0].length === 0) acc.push([]);
        acc[acc.length - 1].push(val);
        return acc;
      }, []);
    } catch (err) {
      console.error(`[ML Engine] Batch prediction failed for ${modelName}:`, err);
      throw err;
    }
  }

  async saveModel(modelName, savePath) {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    try {
      const dirPath = path.dirname(savePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      await model.save(`file://${savePath}`);
      console.log(`[ML Engine] Model ${modelName} saved to ${savePath}`);
    } catch (err) {
      console.error(`[ML Engine] Failed to save model ${modelName}:`, err);
      throw err;
    }
  }

  evaluateModel(modelName, testData) {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    try {
      const tf = getTensorflow();
      const xs = tf.tensor2d(testData.features);
      const ys = tf.tensor2d(testData.labels);

      const evaluation = model.evaluate(xs, ys);
      const [loss, accuracy] = evaluation;

      xs.dispose();
      ys.dispose();

      return {
        loss: loss.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    } catch (err) {
      console.error(`[ML Engine] Evaluation failed for ${modelName}:`, err);
      throw err;
    }
  }

  generatePredictionAPI(modelName, app) {
    app.post(`/ml/${modelName}/predict`, async (req, res) => {
      try {
        const { data } = req.body;
        if (!data) {
          return res.status(400).json({ error: 'Missing data field' });
        }

        const prediction = await this.predict(modelName, data);
        res.json(prediction);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post(`/ml/${modelName}/batch-predict`, async (req, res) => {
      try {
        const { dataArray } = req.body;
        if (!dataArray || !Array.isArray(dataArray)) {
          return res.status(400).json({ error: 'Missing or invalid dataArray field' });
        }

        const predictions = await this.batchPredict(modelName, dataArray);
        res.json({ predictions });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get(`/ml/${modelName}/stats`, (req, res) => {
      const modelPredictions = this.predictions.filter(p => p.model === modelName);
      res.json({
        totalPredictions: modelPredictions.length,
        averageConfidence: modelPredictions.length > 0
          ? modelPredictions.reduce((sum, p) => sum + p.confidence, 0) / modelPredictions.length
          : 0,
        recentPredictions: modelPredictions.slice(-10)
      });
    });
  }

  getModelsList() {
    return Array.from(this.models.keys());
  }

  getPredictionHistory(modelName = null) {
    if (modelName) {
      return this.predictions.filter(p => p.model === modelName);
    }
    return this.predictions;
  }

  clearPredictionHistory() {
    this.predictions = [];
  }

  async exportModelAsComponent(modelName, componentType = 'react') {
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not found`);

    if (componentType === 'react') {
      return this.generateReactMLComponent(modelName);
    } else if (componentType === 'vue') {
      return this.generateVueMLComponent(modelName);
    }
  }

  generateReactMLComponent(modelName) {
    return `import React, { useState } from 'react';
import api from '../api/client';

export function ${modelName}Predictor() {
  const [input, setInput] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await api.post('/ml/${modelName}/predict', {
        data: input.split(',').map(Number)
      });
      setPrediction(response.data);
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-predictor">
      <h2>${modelName} Prediction</h2>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter comma-separated values"
      />
      <button onClick={handlePredict} disabled={loading}>
        {loading ? 'Predicting...' : 'Predict'}
      </button>
      {prediction && (
        <div className="result">
          <p>Prediction: {prediction.prediction.join(', ')}</p>
          <p>Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
}`;
  }

  generateVueMLComponent(modelName) {
    return `<template>
  <div class="ml-predictor">
    <h2>${modelName} Prediction</h2>
    <input
      v-model="input"
      type="text"
      placeholder="Enter comma-separated values"
    />
    <button @click="handlePredict" :disabled="loading">
      {{ loading ? 'Predicting...' : 'Predict' }}
    </button>
    <div v-if="prediction" class="result">
      <p>Prediction: {{ prediction.prediction.join(', ') }}</p>
      <p>Confidence: {{ (prediction.confidence * 100).toFixed(2) }}%</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api/client';

const input = ref('');
const prediction = ref(null);
const loading = ref(false);

const handlePredict = async () => {
  loading.value = true;
  try {
    const response = await api.post('/ml/${modelName}/predict', {
      data: input.value.split(',').map(Number)
    });
    prediction.value = response.data;
  } catch (err) {
    console.error('Prediction error:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.ml-predictor {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

input {
  width: 100%;
  padding: 8px;
  margin: 10px 0;
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

.result {
  margin-top: 15px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
}
</style>`;
  }
}

module.exports = MLEngine;
