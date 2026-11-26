import React, { useState, useEffect } from 'react';
import { useModel } from '../context/ModelContext';
import {
  X,
  Cpu,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Server,
  Layers,
} from 'lucide-react';

export const ModelConfigModal = ({ isOpen, onClose }) => {
  const {
    modelConfig,
    presets,
    systemDefaultModel,
    isCustomActive,
    updateConfig,
    testConnection,
    resetToDefault,
  } = useModel();

  const [form, setForm] = useState({
    enabled: modelConfig.enabled,
    provider: modelConfig.provider || 'openai',
    apiUrl: modelConfig.apiUrl || '',
    apiKey: modelConfig.apiKey || '',
    model: modelConfig.model || '',
  });

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, latencyMs, message, error }
  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        enabled: modelConfig.enabled,
        provider: modelConfig.provider || 'openai',
        apiUrl: modelConfig.apiUrl || '',
        apiKey: modelConfig.apiKey || '',
        model: modelConfig.model || '',
      });
      setTestResult(null);
      setSavedNotification(false);
    }
  }, [isOpen, modelConfig]);

  // Handle escape key and body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPreset = presets.find((p) => p.id === form.provider) || presets[0];

  const handleProviderSelect = (providerId) => {
    const preset = presets.find((p) => p.id === providerId);
    if (!preset) return;

    setForm((prev) => ({
      ...prev,
      provider: providerId,
      apiUrl: preset.defaultApiUrl,
      model: preset.defaultModel || (preset.suggestedModels?.[0] || ''),
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!form.model.trim()) {
      setTestResult({ ok: false, error: 'Please enter or select a model name.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testConnection({
        provider: form.provider,
        apiUrl: form.apiUrl.trim() || currentPreset.defaultApiUrl,
        apiKey: form.apiKey.trim(),
        model: form.model.trim(),
      });

      if (res.ok) {
        setTestResult({
          ok: true,
          latencyMs: res.latencyMs,
          message: res.message || `Successfully connected to ${form.model.trim()}.`,
        });
      } else {
        setTestResult({
          ok: false,
          error: res.message || 'Connection test failed.',
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        error: err.message || 'Connection failed. Verify API key and network accessibility.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateConfig({
      enabled: form.enabled,
      provider: form.provider,
      apiUrl: form.apiUrl.trim(),
      apiKey: form.apiKey.trim(),
      model: form.model.trim(),
    });

    setSavedNotification(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleReset = async () => {
    await resetToDefault();
    setForm({
      enabled: false,
      provider: 'openai',
      apiUrl: '',
      apiKey: '',
      model: '',
    });
    setTestResult(null);
    setSavedNotification(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-config-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl panel-elevated rounded-xl border border-slate-800 bg-[#0a0f1a] text-slate-200 shadow-2xl overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#060910]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/25 text-blue-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 id="model-config-title" className="text-sm font-bold text-white font-mono">
                model configuration // provider & endpoint
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                bring your own API key or connect local Ollama runtime
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Active Model Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#0e1424] border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>Use custom model</span>
                {form.enabled && form.model && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                    active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {form.enabled
                  ? 'Queries will execute against your configured endpoint.'
                  : `Currently using default system model (${systemDefaultModel}).`}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Provider Selection Chips */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 font-medium block">
              1. select provider preset:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((preset) => {
                const isSelected = form.provider === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleProviderSelect(preset.id)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-mono text-left transition-colors border focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                        : 'bg-[#060910] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold truncate">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {preset.id === 'ollama' ? 'Local host' : preset.id === 'custom' ? 'Custom URL' : 'Cloud API'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Endpoint URL Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>API base URL</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {form.provider === 'ollama' ? 'Default: http://localhost:11434/v1' : 'OpenAI-compatible base endpoint'}
              </span>
            </label>
            <input
              type="text"
              value={form.apiUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, apiUrl: e.target.value }))}
              placeholder={currentPreset.defaultApiUrl || 'https://api.openai.com/v1'}
              className="w-full bg-[#060910] text-slate-100 placeholder:text-slate-600 text-xs font-mono rounded-lg px-3 py-2 border border-slate-800 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none transition-colors"
            />
          </div>

          {/* Model Name & Suggestions */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>model identifier</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">required</span>
            </label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              placeholder={currentPreset.defaultModel || 'e.g. gpt-4o, llama3, deepseek-chat'}
              className="w-full bg-[#060910] text-slate-100 placeholder:text-slate-600 text-xs font-mono rounded-lg px-3 py-2 border border-slate-800 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none transition-colors"
            />

            {/* Quick Model Suggestion Chips */}
            {currentPreset.suggestedModels?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-500">Suggested:</span>
                {currentPreset.suggestedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, model: m }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                      form.model === m
                        ? 'bg-blue-600/25 text-blue-300 border-blue-500/40'
                        : 'bg-[#0e1424] text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Key Field (Hidden for local Ollama) */}
          {form.provider !== 'ollama' && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>API key</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Stored securely for your session
                </span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={
                    form.provider === 'anthropic'
                      ? 'sk-ant-api03-...'
                      : form.provider === 'gemini'
                      ? 'AIzaSy...'
                      : 'sk-...'
                  }
                  className="w-full bg-[#060910] text-slate-100 placeholder:text-slate-600 text-xs font-mono rounded-lg px-3 py-2 pr-10 border border-slate-800 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Ollama Local Notice */}
          {form.provider === 'ollama' && (
            <div className="p-3 rounded-lg bg-[#0e1424] border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Local Ollama Integration</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Requires Ollama running on your local machine with CORS enabled. To start:
                <code className="block mt-1 p-1.5 rounded bg-[#060910] text-cyan-300 border border-slate-800 select-all">
                  OLLAMA_ORIGINS="*" ollama serve
                </code>
              </p>
            </div>
          )}

          {/* Test Status Feedback Display */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 animate-fade-in ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {testResult.ok ? 'Connection Verified' : 'Connection Failed'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {testResult.ok
                    ? `${testResult.message} Latency: ${testResult.latencyMs}ms.`
                    : testResult.error}
                </div>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !form.model.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#141d2e] hover:bg-[#1a273e] text-slate-300 hover:text-white border border-slate-700/60 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {isCustomActive && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                >
                  Reset to Default
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-1.5 px-4 font-mono font-medium flex items-center gap-1.5"
              >
                {savedNotification ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
