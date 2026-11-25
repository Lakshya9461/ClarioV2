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
  { icon: Layers, label: 'Interactive Slide Decks', desc: '5-stage visual synthesis for viva prep' },
  { icon: Cpu, label: 'Deep Technical Docs', desc: 'Low-level memory models & complexity' },
  { icon: BarChart2, label: 'Empirical Charts', desc: 'Quantitative benchmark comparisons' },
  { icon: Video, label: 'Curated Shorts Mode', desc: 'Redis-cached concept video reels' },
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#101726] border border-slate-800 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200 font-semibold">CLARIO 2.4</span>
            <span className="text-slate-600">//</span>
            <span>B.Tech CSE & Systems Engineering</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Master Technical Concepts With{' '}
              <span className="text-blue-400 underline decoration-blue-500/40 underline-offset-8">
                First-Principles Rigor
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-sans">
              Enter any computer science concept or algorithm. Clario generates structured slide
              presentations, implementation blueprints, memory diagrams, and instant video shorts.
            </p>
          </div>

          {/* Architecture Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {DOMAIN_PILLARS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="panel-base p-3.5 space-y-1 bg-[#0c121d] hover:bg-[#101726] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-200">{label}</div>
                <div className="text-[11px] text-slate-500 leading-snug">{desc}</div>
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
