import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { harnessApi } from '../services/api';
import { AlgorithmVisualizer } from '../components/AlgorithmVisualizer';
import {
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Send,
  Loader2,
  Database,
  Activity,
  Sparkles,
  Presentation,
  Copy,
  Check,
} from 'lucide-react';

export const LearningHarness = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState({ propositions: [], chains: [] });
  const [goalInput, setGoalInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isStaleSession, setIsStaleSession] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('dialogue'); // 'dialogue' | 'visualizer' | 'artifacts'
  const [copiedGraph, setCopiedGraph] = useState(false);

  // Form states for inputs
  const [selectedOption, setSelectedOption] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [thinking, setThinking] = useState('');
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);

  // Load knowledge graph and active session on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [graphRes, sessionRes] = await Promise.all([
        harnessApi.getGraph().catch(() => ({ graph: { propositions: [], chains: [] } })),
        harnessApi.getActiveSession().catch(() => ({ session: null })),
      ]);

      const graphData = graphRes?.graph || graphRes?.data?.graph;
      const sessionData = sessionRes?.session || sessionRes?.data?.session;

      if (graphData) {
        setKnowledgeGraph(graphData);
      }
      if (sessionData) {
        setSession(sessionData);
      }
    } catch (err) {
      console.error('Failed to load harness data:', err);
      setError(err.message || 'Failed to load initial harness data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e?.preventDefault();
    if (!goalInput.trim()) return;

    setSubmitting(true);
    setError('');
    setLastFeedback(null);
    try {
      const res = await harnessApi.startSession(goalInput.trim());
      const nextSession = res?.session || res?.data?.session;
      if (nextSession) {
        setSession(nextSession);
        resetFormInputs();
      }
    } catch (err) {
      setError(err.message || 'Failed to start learning session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSession = () => {
    setSession(null);
    setLastFeedback(null);
    setError('');
    setIsStaleSession(false);
    resetFormInputs();
  };

  const handleApiError = (err, defaultMsg) => {
    if (err?.status === 404 || err?.message?.includes('not found') || err?.message?.includes('404')) {
      setError('The learning session was not found on the server (the in-memory database was reset during server reload). Click below to start fresh.');
      setIsStaleSession(true);
    } else {
      setError(err?.message || defaultMsg);
    }
  };

  const resetFormInputs = () => {
    setSelectedOption('');
    setConfidence(75);
    setThinking('');
    setPracticeAnswer('');
  };

  const handleProbeSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedOption) {
      setError('Please select an option (A, B, C, or D).');
      return;
    }
    if (!thinking.trim()) {
      setError('YOUR THINKING field is required. Explain why you chose this answer.');
      return;
    }

    setSubmitting(true);
    setError('');
    setIsStaleSession(false);
    try {
      const res = await harnessApi.respond(session._id, 'probe', {
        selectedOption,
        confidence,
        thinking: thinking.trim(),
      });
      const nextSession = res?.session || res?.data?.session;
      const nextFeedback = res?.lastEvaluation || res?.data?.lastEvaluation;
      if (nextSession) {
        setSession(nextSession);
        setLastFeedback(nextFeedback);
        resetFormInputs();
      }
    } catch (err) {
      handleApiError(err, 'Failed to submit probe response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptPlan = async () => {
    setSubmitting(true);
    setError('');
    setIsStaleSession(false);
    setLastFeedback(null);
    try {
      const res = await harnessApi.respond(session._id, 'plan_accept', {});
      const nextSession = res?.session || res?.data?.session;
      if (nextSession) {
        setSession(nextSession);
        resetFormInputs();
      }
    } catch (err) {
      handleApiError(err, 'Failed to accept lesson plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePredictSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedOption) {
      setError('Please select an option.');
      return;
    }
    if (!thinking.trim()) {
      setError('YOUR THINKING is required before proceeding.');
      return;
    }

    setSubmitting(true);
    setError('');
    setIsStaleSession(false);
    try {
      const res = await harnessApi.respond(session._id, 'predict', {
        selectedOption,
        confidence,
        thinking: thinking.trim(),
      });
      const nextSession = res?.session || res?.data?.session;
      const nextFeedback = res?.lastEvaluation || res?.data?.lastEvaluation;
      if (nextSession) {
        setSession(nextSession);
        setLastFeedback(nextFeedback);
        resetFormInputs();
        // Refresh knowledge graph
        harnessApi.getGraph().then((g) => {
          const graphData = g?.graph || g?.data?.graph;
          if (graphData) setKnowledgeGraph(graphData);
        });
      }
    } catch (err) {
      handleApiError(err, 'Failed to submit predict response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePracticeSubmit = async (e) => {
    e?.preventDefault();
    if (!practiceAnswer.trim()) {
      setError('Please provide your solution and reasoning.');
      return;
    }

    setSubmitting(true);
    setError('');
    setIsStaleSession(false);
    try {
      const res = await harnessApi.respond(session._id, 'practice', {
        learnerResponse: practiceAnswer.trim(),
      });
      const nextSession = res?.session || res?.data?.session;
      const nextFeedback = res?.lastEvaluation || res?.data?.lastEvaluation;
      if (nextSession) {
        setSession(nextSession);
        setLastFeedback(nextFeedback);
        resetFormInputs();
        // Refresh knowledge graph
        harnessApi.getGraph().then((g) => {
          const graphData = g?.graph || g?.data?.graph;
          if (graphData) setKnowledgeGraph(graphData);
        });
      }
    } catch (err) {
      handleApiError(err, 'Failed to submit practice response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKnowledgeGraph = () => {
    const markdown = `# Clario Knowledge Graph\n\n## Propositions\n${knowledgeGraph.propositions?.map((p) => `- [${p.status}] [topic: ${p.topic}] ${p.claim}`).join('\n') || ''}\n\n## Chains\n${knowledgeGraph.chains?.map((c) => `- ${c.premises?.join(' + ')} -> ${c.conclusion}`).join('\n') || ''}\n`;
    navigator.clipboard.writeText(markdown);
    setCopiedGraph(true);
    setTimeout(() => setCopiedGraph(false), 2000);
  };

  const currentProbe = session?.phase === 'MEASURE' ? session.probes?.[session.currentProbeIndex] : null;
  const currentTeachingNode = session?.phase === 'TEACH' ? session.teaching?.nodes?.[session.teaching?.currentNodeIndex] : null;
  const currentPracticeProblem = session?.phase === 'PRACTICE' ? session.practice?.problems?.[session.practice?.currentProblemIndex] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-mono text-slate-200">
      {/* ── Header ── */}
      <div className="p-4 rounded-xl bg-[#0b101b] border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">Clario — Agent Harness for Learning</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                COGNITIVE TUTOR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Build usable understanding. Teach step-by-step from prerequisites.
            </p>
          </div>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141d2e] border border-slate-700 text-xs">
              <span className="text-slate-400">PHASE:</span>
              <span className="text-emerald-400 font-bold tracking-wider">{session.phase}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">Status: Ready</div>
          )}
          {session && (
            <button
              onClick={handleResetSession}
              title="Reset session and start over"
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-700/60 text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          {isStaleSession && (
            <button
              onClick={handleResetSession}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shrink-0 self-start sm:self-auto transition-colors"
            >
              Start Fresh Session
            </button>
          )}
        </div>
      )}

      {/* ── Workspace Tab Switcher (When Session Active) ── */}
      {session && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveWorkspaceTab('dialogue')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeWorkspaceTab === 'dialogue'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[#0e1424] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Socratic Dialogue ({session.phase})</span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('visualizer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeWorkspaceTab === 'visualizer'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-[#0e1424] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Visualizer</span>
              {session.visualizationTrace && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('artifacts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeWorkspaceTab === 'artifacts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-[#0e1424] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Created Propositions ({knowledgeGraph.propositions?.length || 0})</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/', { state: { autoAsk: session.goal } })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border border-blue-500/40 text-blue-200 text-xs font-sans font-bold transition-all"
            title="Generate full slide deck presentation and deep dive on Home"
          >
            <Presentation className="w-3.5 h-3.5 text-blue-400" />
            <span>✨ Synthesize Slides & Deep Dive</span>
          </button>
        </div>
      )}

      {/* ── Main Work Area ── */}
      {activeWorkspaceTab === 'visualizer' && session ? (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-[#0c121e] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>Interactive Algorithm & Architecture Simulation</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  LIVE VISUALIZER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Visualizing state changes, call stacks, memory models, and execution flow for:{' '}
                <strong className="text-cyan-200 font-mono">{session.goal}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveWorkspaceTab('dialogue')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Resume Socratic Dialogue</span>
              </button>
            </div>
          </div>

          <AlgorithmVisualizer
            trace={session.visualizationTrace}
            customPrompt={session.goal}
          />
        </div>
      ) : activeWorkspaceTab === 'artifacts' && session ? (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-[#0c121e] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Created Knowledge Graph Propositions (./knowledge-graph.md)
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Propositions, invariant claims, and reasoning chains constructed by Clario during your learning sessions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyKnowledgeGraph}
                className="px-3 py-1.5 rounded-lg bg-[#141e30] hover:bg-[#1a273e] text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedGraph ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedGraph ? 'Copied Markdown!' : 'Copy Markdown'}</span>
              </button>
              <button
                onClick={() => setActiveWorkspaceTab('dialogue')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Resume Dialogue</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Propositions Grid */}
            <div className="panel-base p-5 bg-[#0e1424] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Propositions ({knowledgeGraph.propositions?.length || 0})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Claims & Invariants</span>
              </div>
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {knowledgeGraph.propositions?.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-6 text-center">
                    No propositions created yet. Walk through a lesson to construct new knowledge claims.
                  </div>
                ) : (
                  knowledgeGraph.propositions.map((p, idx) => {
                    const tagColors = {
                      solid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      shaky: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      weak: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                    };
                    const color = tagColors[p.status] || tagColors.shaky;
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-[#070b13] border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold uppercase ${color}`}>
                            [{p.status}]
                          </span>
                          <span className="text-[10px] text-blue-400 font-mono">{p.topic}</span>
                        </div>
                        <p className="text-xs text-white font-sans leading-relaxed">{p.claim}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chains Grid */}
            <div className="panel-base p-5 bg-[#0e1424] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Reasoning Chains ({knowledgeGraph.chains?.length || 0})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Premises -&gt; Conclusion</span>
              </div>
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {knowledgeGraph.chains?.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-6 text-center">
                    No multi-premise reasoning chains chained yet.
                  </div>
                ) : (
                  knowledgeGraph.chains.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#070b13] border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="text-slate-400 font-semibold">Premises:</div>
                      <div className="text-blue-300 pl-2 border-l border-blue-500/30 leading-relaxed">
                        {c.premises?.join(' + ')}
                      </div>
                      <div className="text-slate-400 font-semibold flex items-center gap-1.5 pt-1">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Conclusion:</span>
                      </div>
                      <div className="text-emerald-300 pl-2 border-l border-emerald-500/30 leading-relaxed font-bold">
                        {c.conclusion}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Harness Console */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Simulation Notification Banner */}
            {session?.visualizationTrace && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-cyan-200">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                    <Activity className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Interactive Visualizer Created</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300">ANIMATED</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                      {session.visualizationTrace.title} ({session.visualizationTrace.steps?.length || 0} interactive steps)
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveWorkspaceTab('visualizer')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Launch Simulation</span>
                </button>
              </div>
            )}

            {/* 1. START / GOAL INPUT */}
          {!session && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Session Start</div>
                <h2 className="text-base font-bold text-white">What do you want to learn?</h2>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Enter an algorithm, data structure, or computer science concept (e.g. "Recursion and call stack", "Red-Black Trees", "Merge Sort").
                  Clario will measure your prerequisite understanding first.
                </p>
              </div>

              <form onSubmit={handleStartSession} className="space-y-3 pt-2">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g. Recursion and the call stack in memory"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-blue-500 font-sans"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !goalInput.trim()}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Start Learning Loop (MEASURE)</span>
                </button>
              </form>
            </div>
          )}

          {/* 2. PHASE: MEASURE */}
          {session?.phase === 'MEASURE' && currentProbe && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  MEASURE — PREREQUISITE DIAGNOSTIC
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  PROBE ({currentProbe.probeIndex}/{currentProbe.totalProbes})
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-blue-300 font-mono font-semibold">
                  Prerequisite: {currentProbe.concept}
                </div>
                <div className="text-sm text-white font-sans font-medium leading-relaxed bg-[#090d16] p-3.5 rounded-lg border border-slate-800">
                  {currentProbe.question}
                </div>
              </div>

              <form onSubmit={handleProbeSubmit} className="space-y-4 pt-1">
                {/* Options */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-bold">Select Option:</label>
                  <div className="space-y-2">
                    {currentProbe.options.map((opt) => {
                      const letter = opt.slice(0, 2);
                      const isSelected = selectedOption.startsWith(letter);
                      return (
                        <div
                          key={opt}
                          onClick={() => setSelectedOption(letter)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 font-sans ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                              : 'bg-[#0a0f1b] border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-mono font-bold text-[10px] ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {opt[0]}
                          </span>
                          <span className="leading-snug pt-0.5">{opt.slice(3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confidence Slider */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#090d16] border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">CONFIDENCE:</span>
                    <span className="text-blue-400 font-mono font-bold">{confidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0% (Guessing)</span>
                    <span>50%</span>
                    <span>100% (Certain)</span>
                  </div>
                </div>

                {/* Thinking Field (REQUIRED) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold flex items-center justify-between">
                    <span>YOUR THINKING: <span className="text-rose-400 font-normal">*Required</span></span>
                    <span className="text-[10px] text-slate-500">Why this answer? Doubts, reasoning</span>
                  </label>
                  <textarea
                    rows={3}
                    value={thinking}
                    onChange={(e) => setThinking(e.target.value)}
                    placeholder="Explain your reasoning here. The thinking field matters more than the option — it reveals HOW you reason."
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Diagnostic Probe</span>
                </button>
              </form>

              {lastFeedback && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 animate-fade-in">
                  <div className="font-bold text-emerald-400">Score: {lastFeedback.score?.toUpperCase()}</div>
                  <div className="text-slate-300 font-sans">{lastFeedback.reasoningModel}</div>
                </div>
              )}
            </div>
          )}

          {/* 3. PHASE: PLAN */}
          {session?.phase === 'PLAN' && session.lessonPlan && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-5 animate-fade-in">
              <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  PLAN — LESSON MAP
                </div>
                <span className="text-xs text-slate-400 font-mono">Dependency Tree</span>
              </div>

              <div className="bg-[#070b13] p-4 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre leading-relaxed overflow-x-auto shadow-inner">
                {session.lessonPlan.asciiTree}
              </div>

              <div className="text-xs text-slate-300 font-sans leading-relaxed bg-[#0b101c] p-3.5 rounded-lg border border-slate-800/80">
                <span className="font-bold text-white block mb-1">Plan Rationale:</span>
                {session.lessonPlan.explanation}
              </div>

              <button
                onClick={handleAcceptPlan}
                disabled={submitting}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Proceed with Lesson Map (TEACH)</span>
              </button>
            </div>
          )}

          {/* 4. PHASE: TEACH */}
          {session?.phase === 'TEACH' && currentTeachingNode && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  TEACH — PREDICT & REPAIR
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Node [{session.teaching.currentNodeIndex + 1}/{session.teaching.nodes.length}]
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-bold">CURRENT NODE:</div>
                <div className="text-sm font-bold text-white">{currentTeachingNode.name}</div>
              </div>

              {lastFeedback && (
                <div className={`p-3.5 rounded-lg border text-xs space-y-1.5 animate-fade-in font-sans ${
                  lastFeedback.action === 'repair'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : lastFeedback.action === 'force_advance'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {lastFeedback.action === 'repair' && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{lastFeedback.action === 'repair' ? 'REPAIR MISCONCEPTION' : 'EVALUATION'}</span>
                  </div>
                  {lastFeedback.misconception && (
                    <div className="text-xs font-semibold text-amber-200">
                      Misconception: {lastFeedback.misconception}
                    </div>
                  )}
                  <p className="leading-relaxed">{lastFeedback.explanation}</p>

                  {lastFeedback.action !== 'repair' && (
                    <div className="mt-2 p-2.5 rounded bg-black/50 border border-emerald-500/30 text-[11px] font-mono space-y-1">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>PROPOSITION CREATED & RECORDED TO ./knowledge-graph.md</span>
                      </div>
                      <div className="text-slate-200">
                        {currentTeachingNode.predictQuestion?.conceptClaim
                          ? `- [solid] [topic: ${session.goal}] ${currentTeachingNode.predictQuestion.conceptClaim}`
                          : `- [solid] [topic: ${session.goal}] ${currentTeachingNode.name} invariant verified.`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentTeachingNode.predictQuestion && (
                <form onSubmit={handlePredictSubmit} className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold">Prediction Task:</label>
                    <div className="text-sm text-white font-sans font-medium leading-relaxed bg-[#090d16] p-3.5 rounded-lg border border-slate-800">
                      {currentTeachingNode.predictQuestion.question}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentTeachingNode.predictQuestion.options.map((opt) => {
                      const letter = opt.slice(0, 2);
                      const isSelected = selectedOption.startsWith(letter);
                      return (
                        <div
                          key={opt}
                          onClick={() => setSelectedOption(letter)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 font-sans ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                              : 'bg-[#0a0f1b] border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-mono font-bold text-[10px] ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {opt[0]}
                          </span>
                          <span className="leading-snug pt-0.5">{opt.slice(3)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confidence Slider */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-[#090d16] border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">CONFIDENCE:</span>
                      <span className="text-blue-400 font-mono font-bold">{confidence}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Thinking Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold">
                      YOUR THINKING: <span className="text-rose-400 font-normal">*Required</span>
                    </label>
                    <textarea
                      rows={3}
                      value={thinking}
                      onChange={(e) => setThinking(e.target.value)}
                      placeholder="Why do you predict this behavior? Explain your underlying reasoning."
                      className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Submit Prediction</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 5. PHASE: PRACTICE */}
          {session?.phase === 'PRACTICE' && currentPracticeProblem && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  PRACTICE — REASONING CHALLENGE
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  PROBLEM ({currentPracticeProblem.problemIndex}/{currentPracticeProblem.totalProblems})
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  Target Invariant: <span className="text-white font-bold">{currentPracticeProblem.targetConcept}</span>
                  {currentPracticeProblem.isTargetShaky && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      [!] Shaky Node Focus
                    </span>
                  )}
                </div>
                <div className="text-sm text-white font-sans font-medium leading-relaxed bg-[#090d16] p-4 rounded-lg border border-slate-800">
                  {currentPracticeProblem.prompt}
                </div>
              </div>

              <form onSubmit={handlePracticeSubmit} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold">
                    YOUR SOLUTION & REASONING:
                  </label>
                  <textarea
                    rows={4}
                    value={practiceAnswer}
                    onChange={(e) => setPracticeAnswer(e.target.value)}
                    placeholder="Provide your solution and the core invariant reasoning behind it. We grade reasoning, not keywords."
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Practice Solution</span>
                </button>
              </form>

              {lastFeedback && (
                <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs space-y-1 font-sans animate-fade-in">
                  <div className="font-bold text-blue-400">
                    Evaluation: {lastFeedback.isSound ? 'SOUND REASONING' : 'NEEDS REFINEMENT'}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{lastFeedback.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* 6. PHASE: COMPLETED */}
          {session?.phase === 'COMPLETED' && (
            <div className="panel-base p-6 bg-[#0e1424] border border-slate-800 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Session Complete — Knowledge Synthesized</span>
              </div>

              {session.practice?.summary && (
                <div className="p-4 rounded-lg bg-[#070b13] border border-slate-800 text-xs font-mono space-y-2">
                  <div className="text-slate-400 font-bold">--- SUMMARY ---</div>
                  <div><span className="text-emerald-400 font-bold">solid:</span> {session.practice.summary.solid}</div>
                  <div><span className="text-amber-400 font-bold">shaky:</span> {session.practice.summary.shaky}</div>
                  <div><span className="text-blue-400 font-bold">revisit-when:</span> {session.practice.summary.revisitWhen}</div>
                  <div className="text-slate-400 font-bold">---</div>
                </div>
              )}

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Propositions and prerequisite reasoning chains have been saved to <span className="text-white font-mono font-bold">./knowledge-graph.md</span>.
                Future sessions will draw from this graph, skipping verified solid items and reinforcing shaky concepts.
              </p>

              <button
                onClick={() => {
                  setSession(null);
                  setGoalInput('');
                  setLastFeedback(null);
                }}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New Learning Goal</span>
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Memory / Knowledge Graph View */}
        <div className="space-y-4">
          <div className="panel-base p-4 bg-[#0c121e] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Database className="w-4 h-4 text-blue-400" />
                <span>./knowledge-graph.md</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {knowledgeGraph.propositions?.length || 0} props
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Maintains proposition claims and premise-to-conclusion reasoning chains tagged [solid], [shaky], or [weak].
            </p>

            {/* Propositions List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {knowledgeGraph.propositions?.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic p-3 text-center">
                  No propositions recorded yet. Start a session to build the graph.
                </div>
              ) : (
                knowledgeGraph.propositions.map((p, idx) => {
                  const tagColors = {
                    solid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    shaky: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    weak: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                  };
                  const color = tagColors[p.status] || tagColors.shaky;
                  return (
                    <div key={idx} className="p-2 rounded bg-[#070b13] border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold uppercase ${color}`}>
                          [{p.status}]
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{p.topic}</span>
                      </div>
                      <p className="text-slate-300 font-sans leading-snug">{p.claim}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reasoning Chains */}
            {knowledgeGraph.chains?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Chains (Premises -&gt; Conclusion)
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[10px] font-mono text-slate-300">
                  {knowledgeGraph.chains.map((c, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-[#070b13] border border-slate-800">
                      <span className="text-blue-300">{c.premises?.join(' + ')}</span>
                      <span className="text-slate-500 mx-1">-&gt;</span>
                      <span className="text-emerald-300">{c.conclusion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default LearningHarness;
