import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStreamAnswer } from '../hooks/useStreamAnswer';
import { QuestionForm } from '../components/QuestionForm';
import { AnswerPanel } from '../components/AnswerPanel';
import {
  Layers,
  Cpu,
  BarChart2,
  Video,
  Sparkles,
  Terminal,
  BookOpen,
} from 'lucide-react';

const DOMAIN_PILLARS = [
  { icon: Layers, label: 'State traces', desc: 'Step-by-step algorithm and stack inspection' },
  { icon: Cpu, label: 'Memory models', desc: 'Hardware architecture, cache, and heap layouts' },
  { icon: BarChart2, label: 'Complexity proofs', desc: 'Empirical runtime analysis and edge cases' },
  { icon: Video, label: 'Visual walk-throughs', desc: 'Focused concept summaries for viva preparation' },
];

export const Home = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { state, ask, askFollowUp, simplify, reset } = useStreamAnswer();
  const isWorking = state.status === 'ASKING' || state.status === 'STREAMING';
  const hasActiveSession = state.status !== 'IDLE';

  useEffect(() => {
    if (location.state?.autoAsk && state.status === 'IDLE') {
      ask(location.state.autoAsk);
    }
  }, [location.state?.autoAsk]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* ═══ Workstation Hero Section (Shown when no active inquiry) ═══ */}
      {!hasActiveSession && (
        <div className="space-y-6 pt-6 sm:pt-10 pb-2 animate-fade-in">
          {/* Status Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#101726] border border-slate-800 text-xs font-mono text-slate-300">
            <span className="font-semibold text-blue-400">workbench</span>
            <span className="text-slate-600">//</span>
            <span>computer science and systems engineering</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Understand how code and systems actually execute.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed font-sans">
              Inspect verified algorithm execution traces, examine hardware memory hierarchies, and review structured concept proofs for technical interviews and viva exams.
            </p>
          </div>

          {/* Architecture Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {DOMAIN_PILLARS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="panel-base p-3.5 space-y-1.5 bg-[#0c121d] hover:bg-[#101726] transition-colors border border-slate-800/80 rounded-lg"
              >
                <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-200">{label}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Inquiry Console ═══ */}
      {!hasActiveSession && (
        <div className="animate-fade-up">
          <QuestionForm onSubmit={ask} isLoading={isWorking} status={state.status} />
        </div>
      )}

      {/* ═══ Active Analysis & Continuous Discussion Session ═══ */}
      {hasActiveSession && (
        <div className="animate-fade-up">
          <AnswerPanel
            state={state}
            onSimplify={simplify}
            onReset={reset}
            onFollowUp={askFollowUp}
          />
        </div>
      )}

      {/* ═══ Idle State Placeholder ═══ */}
      {state.status === 'IDLE' && (
        <div className="animate-fade-up">
          <AnswerPanel state={state} onSimplify={simplify} onReset={reset} />
        </div>
      )}
    </div>
  );
};
