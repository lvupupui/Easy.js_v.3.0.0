class AIProviderManager {
  constructor(config = {}) {
    this.config = {
      defaultProvider: config.defaultProvider || process.env.AI_PROVIDER || 'openai',
      openaiModel: config.openaiModel || process.env.OPENAI_MODEL || 'gpt-5.1',
      geminiModel: config.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-pro',
      anthropicModel: config.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      ...config
    };
    this.clients = {
      ...(config.clients || {})
    };
  }

  getProvider(provider = this.config.defaultProvider) {
    const normalized = String(provider || '').toLowerCase();
    if (!['openai', 'gemini', 'google', 'anthropic'].includes(normalized)) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
    return normalized === 'google' ? 'gemini' : normalized;
  }

  getClient(provider) {
    const normalized = this.getProvider(provider);
    if (this.clients[normalized]) {
      return this.clients[normalized];
    }

    if (normalized === 'openai') {
      const OpenAI = require('openai');
      this.clients.openai = new OpenAI({
        apiKey: this.config.openaiApiKey || process.env.OPENAI_API_KEY
      });
      return this.clients.openai;
    }

    if (normalized === 'gemini') {
      const { GoogleGenAI } = require('@google/genai');
      this.clients.gemini = new GoogleGenAI({
        apiKey: this.config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      });
      return this.clients.gemini;
    }

    const Anthropic = require('@anthropic-ai/sdk');
    this.clients.anthropic = new Anthropic({
      apiKey: this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    });
    return this.clients.anthropic;
  }

  async complete(input, options = {}) {
    const provider = this.getProvider(options.provider);
    const prompt = this.normalizePrompt(input);

    if (provider === 'openai') {
      return this.completeWithOpenAI(prompt, options);
    }
    if (provider === 'gemini') {
      return this.completeWithGemini(prompt, options);
    }
    return this.completeWithAnthropic(prompt, options);
  }

  async completeWithOpenAI(prompt, options) {
    const client = this.getClient('openai');
    const response = await client.responses.create({
      model: options.model || this.config.openaiModel,
      input: prompt,
      temperature: options.temperature,
      max_output_tokens: options.maxTokens || options.max_output_tokens
    });

    return {
      provider: 'openai',
      model: response.model || options.model || this.config.openaiModel,
      text: response.output_text || this.extractOpenAIText(response),
      raw: response
    };
  }

  async completeWithGemini(prompt, options) {
    const client = this.getClient('gemini');
    const response = await client.models.generateContent({
      model: options.model || this.config.geminiModel,
      contents: prompt,
      config: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    });

    return {
      provider: 'gemini',
      model: options.model || this.config.geminiModel,
      text: response.text || this.extractGeminiText(response),
      raw: response
    };
  }

  async completeWithAnthropic(prompt, options) {
    const client = this.getClient('anthropic');
    const response = await client.messages.create({
      model: options.model || this.config.anthropicModel,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      messages: [{ role: 'user', content: prompt }]
    });

    return {
      provider: 'anthropic',
      model: response.model || options.model || this.config.anthropicModel,
      text: this.extractAnthropicText(response),
      raw: response
    };
  }

  async embed(input, options = {}) {
    const provider = this.getProvider(options.provider || 'openai');
    if (provider !== 'openai') {
      throw new Error(`Embeddings are currently implemented for OpenAI only, received: ${provider}`);
    }

    const client = this.getClient('openai');
    const response = await client.embeddings.create({
      model: options.model || this.config.openaiEmbeddingModel || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
      input
    });

    return {
      provider: 'openai',
      model: response.model || options.model || 'text-embedding-3-large',
      embeddings: response.data.map(item => item.embedding),
      raw: response
    };
  }

  middleware(options = {}) {
    const routePath = options.path || '/ai/complete';
    return (req, res, next) => {
      if (req.method !== 'POST' || req.path !== routePath) {
        return next();
      }

      return this.complete(req.body.prompt || req.body.input, req.body)
        .then(result => res.json(result))
        .catch(next);
    };
  }

  normalizePrompt(input) {
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) {
      return input.map(message => {
        if (typeof message === 'string') return message;
        return `${message.role || 'user'}: ${message.content || ''}`;
      }).join('\n');
    }
    if (input && typeof input === 'object') {
      return input.prompt || input.input || JSON.stringify(input);
    }
    throw new Error('AI input must be a string, message array, or object');
  }

  extractOpenAIText(response) {
    return (response.output || [])
      .flatMap(item => item.content || [])
      .map(part => part.text || '')
      .join('');
  }

  extractGeminiText(response) {
    const candidates = response.candidates || [];
    return candidates
      .flatMap(candidate => (candidate.content && candidate.content.parts) || [])
      .map(part => part.text || '')
      .join('');
  }

  extractAnthropicText(response) {
    return (response.content || [])
      .map(part => part.text || '')
      .join('');
  }
}

module.exports = AIProviderManager;
