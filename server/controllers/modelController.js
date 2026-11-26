import User from '../models/User.js';
import { testModelConnection } from '../services/llmService.js';

export const PROVIDER_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultApiUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    suggestedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    defaultApiUrl: 'https://api.anthropic.com/v1/messages',
    requiresApiKey: true,
    suggestedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    suggestedModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    defaultApiUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultApiUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local Machine)',
    defaultApiUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
    suggestedModels: ['llama3', 'qwen2.5-coder', 'mistral', 'deepseek-r1'],
    defaultModel: 'llama3',
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    defaultApiUrl: '',
    requiresApiKey: false,
    suggestedModels: [],
    defaultModel: '',
  },
];

/**
 * Get available provider presets and system default configuration
 * GET /api/models/presets
 */
export const getPresets = (req, res) => {
  res.status(200).json({
    ok: true,
    presets: PROVIDER_PRESETS,
    systemDefault: {
      model: process.env.LLM_MODEL || 'qwen3.8-flash-next-gyro-gyro-m',
      hasConfiguredSystemKey: Boolean(process.env.LLM_API_KEY),
    },
  });
};

/**
 * Get user's custom model configuration
 * GET /api/models/config
 */
export const getModelConfig = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(200).json({
        ok: true,
        customModel: {
          enabled: false,
          provider: 'openai',
          apiUrl: '',
          apiKey: '',
          model: '',
        },
      });
    }

    const user = await User.findById(req.user._id).select('customModel');
    res.status(200).json({
      ok: true,
      customModel: user?.customModel || {
        enabled: false,
        provider: 'openai',
        apiUrl: '',
        apiKey: '',
        model: '',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user's custom model configuration
 * PUT /api/models/config
 */
export const updateModelConfig = async (req, res, next) => {
  try {
    const { enabled, provider, apiUrl, apiKey, model } = req.body;

    const validProviders = ['openai', 'anthropic', 'gemini', 'groq', 'deepseek', 'ollama', 'custom'];
    const sanitizedProvider = validProviders.includes(provider) ? provider : 'openai';

    const customModel = {
      enabled: Boolean(enabled),
      provider: sanitizedProvider,
      apiUrl: typeof apiUrl === 'string' ? apiUrl.trim() : '',
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : '',
      model: typeof model === 'string' ? model.trim() : '',
    };

    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { customModel }, { new: true, runValidators: true });
    }

    res.status(200).json({
      ok: true,
      message: customModel.enabled
        ? `Custom model (${customModel.model || customModel.provider}) configured successfully.`
        : 'Reverted to system default model.',
      customModel,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Test connectivity for a custom model configuration
 * POST /api/models/test
 */
export const testModelConnectionEndpoint = async (req, res, next) => {
  try {
    const { provider, apiUrl, apiKey, model } = req.body;

    if (!model || typeof model !== 'string' || !model.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'Model name or identifier is required to test connection (e.g. gpt-4o, llama3).',
      });
    }

    const testResult = await testModelConnection({
      provider,
      apiUrl,
      apiKey,
      model: model.trim(),
    });

    res.status(200).json({
      ok: true,
      message: `Successfully connected to ${model.trim()} via ${provider || 'OpenAI'}.`,
      latencyMs: testResult.latencyMs,
      sampleResponse: testResult.sampleResponse,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      message: err.message || 'Connection test failed. Check API key, base URL, and model identifier.',
    });
  }
};
