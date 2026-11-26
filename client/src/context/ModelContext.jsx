import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { modelApi } from '../services/api';

const DEFAULT_CONFIG = {
  enabled: false,
  provider: 'openai',
  apiUrl: '',
  apiKey: '',
  model: '',
};

export const FALLBACK_PRESETS = [
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

const ModelContext = createContext(null);

export const ModelProvider = ({ children }) => {
  const [modelConfig, setModelConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('clario_custom_model');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_CONFIG;
  });

  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [systemDefaultModel, setSystemDefaultModel] = useState('qwen3.8-flash');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load presets and sync server configuration on mount
  useEffect(() => {
    const fetchModelDetails = async () => {
      try {
        const [presetsRes, configRes] = await Promise.allSettled([
          modelApi.getPresets(),
          modelApi.getConfig(),
        ]);

        if (presetsRes.status === 'fulfilled' && presetsRes.value.ok) {
          if (Array.isArray(presetsRes.value.presets) && presetsRes.value.presets.length > 0) {
            setPresets(presetsRes.value.presets);
          }
          if (presetsRes.value.systemDefault?.model) {
            setSystemDefaultModel(presetsRes.value.systemDefault.model);
          }
        }

        if (configRes.status === 'fulfilled' && configRes.value.ok && configRes.value.customModel) {
          const serverConfig = configRes.value.customModel;
          // If server has enabled customModel and local doesn't, sync from server
          if (serverConfig.enabled && serverConfig.model) {
            setModelConfig((prev) => ({
              ...prev,
              ...serverConfig,
            }));
            try {
              localStorage.setItem('clario_custom_model', JSON.stringify(serverConfig));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Could not sync custom model config from server:', err);
      }
    };

    fetchModelDetails();
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    const merged = { ...modelConfig, ...newConfig };
    setModelConfig(merged);
    try {
      localStorage.setItem('clario_custom_model', JSON.stringify(merged));
    } catch (_) {}

    // Persist to server if authenticated
    try {
      await modelApi.updateConfig(merged);
    } catch (_) {
      // Ignored for unauthenticated users
    }
  }, [modelConfig]);

  const testConnection = useCallback(async (configToTest) => {
    return await modelApi.testConnection(configToTest);
  }, []);

  const resetToDefault = useCallback(async () => {
    const resetConfig = { ...DEFAULT_CONFIG };
    setModelConfig(resetConfig);
    try {
      localStorage.removeItem('clario_custom_model');
    } catch (_) {}

    try {
      await modelApi.updateConfig(resetConfig);
    } catch (_) {}
  }, []);

  const isCustomActive = Boolean(modelConfig.enabled && modelConfig.model);

  const activeModelLabel = isCustomActive
    ? `${modelConfig.model} (${modelConfig.provider})`
    : `Default (${systemDefaultModel.split('-')[0]})`;

  return (
    <ModelContext.Provider
      value={{
        modelConfig,
        presets,
        systemDefaultModel,
        isCustomActive,
        activeModelLabel,
        isModalOpen,
        setIsModalOpen,
        updateConfig,
        testConnection,
        resetToDefault,
        loading,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};
