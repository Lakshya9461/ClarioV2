import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { TagBadge } from './TagBadge';
import { ChartView } from './ChartView';
import { SlideDeckView } from './SlideDeckView';
import { AlgorithmVisualizer } from './AlgorithmVisualizer';
import { StudyListModal } from './StudyListModal';
import { RatingModal } from './RatingModal';
import { ShortsModal } from './ShortsModal';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  BookMarked,
  Star,
  Baby,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
  Copy,
  Check,
  Clock,
  Presentation,
  FileText,
  Send,
  Loader2,
  MessageSquare,
  User,
  PlusCircle,
  Lightbulb,
  Cpu,
  Video,
  Activity,
} from 'lucide-react';

export const AnswerPanel = ({ state, onSimplify, onReset, onFollowUp }) => {
  const navigate = useNavigate();
  const {
    status, rawQuestion, refinedPrompt, explanation,
    keyPoints, slides, chartData, visualizationTrace, subjectTag, isCached,
    questionId, stageMessage, error, simplified, isSimplifying,
    followUps = [], isFollowUpStreaming, currentFollowUpChunk,
    searchKeywords,
  } = state;

  const hasSlides = Array.isArray(slides) && slides.length > 0;
  const hasTrace = Boolean(visualizationTrace && Array.isArray(visualizationTrace.steps) && visualizationTrace.steps.length > 0);
  const [showRefinedPrompt, setShowRefinedPrompt] = useState(false);
  const [activeTab, setActiveTab]   = useState(hasTrace ? 'visualizer' : (hasSlides ? 'ppt' : 'full')); // 'ppt' | 'visualizer' | 'full' | 'simplified'
  const [isStudyListOpen, setIsStudyListOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen]       = useState(false);
  const [isShortsOpen, setIsShortsOpen]       = useState(false);
  const [copied, setCopied] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');

  const shortsTopic =
    (searchKeywords && searchKeywords[0]) ||
    (rawQuestion ? rawQuestion.replace(/^(explain|what is the difference between|what is|what are|how does|how do|compare|which is the best|which is better|which is)\s+/i, '').replace(/[?!.]+$/, '').trim() : '') ||
    subjectTag ||
    'computer science';

  const threadEndRef = useRef(null);

  // Synchronize activeTab whenever trace, slides arrive or a new question loads
  useEffect(() => {
    if (hasTrace) {
      setActiveTab('visualizer');
    } else if (hasSlides) {
      setActiveTab('ppt');
    } else {
      setActiveTab('full');
    }
  }, [hasSlides, hasTrace, questionId]);

  // Auto-scroll to latest message when follow-up arrives or streams
  useEffect(() => {
    if (followUps?.length > 0 || isFollowUpStreaming) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [followUps, isFollowUpStreaming, currentFollowUpChunk]);

  const handleCopy = async () => {
    if (!explanation) return;
    await navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFollowUp = (e) => {
    e?.preventDefault();
    if (!followUpInput.trim() || isFollowUpStreaming || !onFollowUp) return;
    onFollowUp(followUpInput.trim());
    setFollowUpInput('');
  };

  const handleSuggestionClick = (suggestion) => {
    if (isFollowUpStreaming || !onFollowUp) return;
    onFollowUp(suggestion);
  };

  // Compute dynamic smart suggestion follow-up chips based on question context
  const suggestionPills = React.useMemo(() => {
    const q = (rawQuestion || '').toLowerCase();
    if (q.includes('c') && q.includes('python')) {
      return [
        'Show a memory leak example in C',
        "How does Python's GIL actually work?",
        'Explain pointers in C with memory diagram',
        'Which is better for competitive programming?',
      ];
    }
    if (q.includes('recursion')) {
      return [
        'What happens if base case is missing?',
        'Show recursion with Fibonacci & memoization',
        'How to convert recursion into an iterative loop?',
        'Explain tail-call optimization in C',
      ];
    }
    if (q.includes('sort')) {
      return [
        'Why is Quicksort faster in real hardware cache?',
        'When should I use Mergesort instead of Quicksort?',
        'Explain stability in sorting with examples',
        'What is Timsort in Python?',
      ];
    }
    if (q.includes('gaming') || q.includes('distro')) {
      return [
        'Explain Valve Proton DXVK vs VKD3D pipeline',
        'Why does Nobara perform better than stock Fedora?',
        'How do fsync and futex2 kernel patches work?',
        'Compare Wayland Gamescope HDR vs X11 latency',
      ];
    }
    return [
      'Give me a runnable code example',
      'What are the most common viva questions on this?',
      'Explain the key trade-offs in production systems',
      'How does this work under the hood in memory?',
    ];
  }, [rawQuestion]);

  /* ── 1. IDLE ── */
  if (status === 'IDLE') {
    return (
      <div className="panel-elevated p-8 sm:p-10 text-center animate-fade-in border border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-7 h-7" />
        </div>
        <h3 className="font-display text-xl font-bold text-white mb-2">
          Engineering Workstation Ready
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Inquire about algorithms, memory models, runtime architectures, or complexity bounds.
          Clario generates interactive slides, empirical charts, and instant video shorts.
        </p>

        {/* Quick capability cards */}
        <div className="grid grid-cols-3 gap-3 mt-8 max-w-sm mx-auto text-xs font-mono">
          {[
            { icon: Presentation, label: 'Slide Deck', color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { icon: MessageSquare,label: 'Chat Thread', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
            { icon: Video,        label: 'Shorts Mode', color: 'text-red-400',     bg: 'bg-red-500/10' },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 border border-slate-800/80 text-center`}>
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className="text-slate-300 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── 2. ASKING / Loading ── */
  if (status === 'ASKING') {
    const isCasual = /^(hi|hello|hey|yo|sup|help|who are you|how are you|thanks|thank you)\b/i.test((rawQuestion || '').trim());
    const stages = isCasual
      ? [
          { label: 'Connecting to Clario AI tutor...',   done: true },
          { label: 'Analyzing request...',               done: !!refinedPrompt },
          { label: 'Preparing response...',              done: false },
        ]
      : [
          { label: 'Checking Redis rate limit...',       done: true  },
          { label: 'Checking Redis answer cache...',     done: !!refinedPrompt },
          { label: 'Refining prompt with AI layer...',   done: !!refinedPrompt },
          { label: 'Generating visual deck & concepts...',done: false },
        ];

    return (
      <div className="panel-elevated p-8 sm:p-10 animate-fade-in border border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-5">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>

        <div className="text-center mb-7">
          <h3 className="font-display text-lg font-bold text-white">
            {stageMessage || (isCasual ? 'Connecting to Clario AI tutor…' : 'Synthesizing your visual learning deck…')}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {isCasual
              ? 'Clario is ready to assist your Computer Science learning'
              : 'Generating structured slide decks, complexity models, and video feeds'}
          </p>
        </div>

        <div className="max-w-xs mx-auto space-y-2">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                stage.done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : i === stages.findIndex(s => !s.done)
                  ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                  : 'bg-slate-800 text-slate-600'
              }`}>
                {stage.done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-2.5 h-2.5" />}
              </div>
              <span className={stage.done ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {refinedPrompt && (
          <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-left animate-fade-up max-w-lg mx-auto">
            <span className="text-xs font-mono font-bold text-blue-300 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Refined Prompt Spec
            </span>
            <p className="text-xs text-slate-300 font-mono leading-relaxed line-clamp-3">
              {refinedPrompt}
            </p>
          </div>
        )}

        <div className="mt-8 rounded-full overflow-hidden bg-slate-800 h-1">
          <div className="h-full bg-blue-500 animate-pulse w-full" />
        </div>
      </div>
    );
  }

  /* ── 3. ERROR ── */
  if (status === 'ERROR') {
    const isRateLimit = error?.toLowerCase().includes('rate limit');
    return (
      <div className="panel-elevated p-6 sm:p-8 border border-rose-500/30 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl shrink-0 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-bold text-rose-300">
              {isRateLimit ? 'Daily Question Quota Reached' : 'Unable to Generate Answer'}
            </h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{error}</p>

            {isRateLimit && (
              <div className="mt-3 p-3 rounded-xl bg-[#0c121d] border border-slate-800 text-xs text-slate-400 font-mono">
                <span className="text-blue-400 font-semibold">Redis Quota Rule: </span>
                Each student receives <code className="text-blue-300">10 requests/day</code> via
                Redis <code className="text-blue-300">INCR + EXPIRE</code>. Resets at midnight UTC.
              </div>
            )}

            <button
              onClick={onReset}
              className="btn-secondary mt-4 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Another Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 4. STREAMING / DONE ── */
  const isStreaming = status === 'STREAMING';

  return (
    <div className="space-y-6 animate-scale-in">
      {/* ── Format Mode Switcher Tabs & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1a] p-2 rounded-xl border border-slate-800">
        {/* Left: View Mode Pills */}
        <div
          role="tablist"
          aria-label="Explanation view modes"
          className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0e1422] border border-slate-800/80"
        >
          {hasTrace && (
            <button
              role="tab"
              id="tab-visualizer"
              aria-controls="panel-visualizer"
              aria-selected={activeTab === 'visualizer'}
              onClick={() => setActiveTab('visualizer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'visualizer'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>visual trace</span>
            </button>
          )}

          {hasSlides && (
            <button
              role="tab"
              id="tab-ppt"
              aria-controls="panel-ppt"
              aria-selected={activeTab === 'ppt'}
              onClick={() => setActiveTab('ppt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                activeTab === 'ppt'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
              <span>slides ({slides.length})</span>
            </button>
          )}

          <button
            role="tab"
            id="tab-full"
            aria-controls="panel-full"
            aria-selected={activeTab === 'full'}
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'full'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{hasSlides ? 'documentation' : 'answer'}</span>
          </button>

          {explanation && (
            <button
              role="tab"
              id="tab-simplified"
              aria-controls="panel-simplified"
              aria-selected={activeTab === 'simplified'}
              onClick={() => {
                if (!simplified) onSimplify();
                setActiveTab('simplified');
              }}
              disabled={isSimplifying}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none ${
                activeTab === 'simplified'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Baby className="w-3.5 h-3.5 text-purple-400" />
              <span>intuitive model</span>
            </button>
          )}
        </div>

        {/* Right: Badges & Actions */}
        <div className="flex items-center gap-2">
          {subjectTag && <TagBadge tag={subjectTag} size="xs" />}

          {isCached ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              <Zap className="w-3 h-3 fill-emerald-400" />
              Cached
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
              <Brain className="w-3 h-3" />
              AI Synthesized
            </span>
          )}

          {!isStreaming && (
            <>
              <button
                onClick={handleCopy}
                title="Copy Markdown Explanation"
                aria-label="Copy Markdown Explanation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {questionId && (
                <>
                  <button
                    onClick={() => setIsStudyListOpen(true)}
                    title="Save to Study List"
                    aria-label="Save to Study List"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                  >
                    <BookMarked className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsRatingOpen(true)}
                    title="Rate this Answer"
                    aria-label="Rate this Answer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Related Shorts Button */}
              <button
                type="button"
                onClick={() => {
                  navigate(`/shorts?topic=${encodeURIComponent(shortsTopic)}&prompt=${encodeURIComponent(rawQuestion || '')}`);
                }}
                title="Watch concept short videos"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 transition-colors"
              >
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>Shorts</span>
              </button>

              {onReset && (
                <button
                  onClick={onReset}
                  title="Ask New Concept"
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Query</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main View (Slide Deck / Visualizer / Technical Doc / ELI5) ── */}

      {/* 0. Interactive Algorithm Visualizer Mode */}
      {activeTab === 'visualizer' && (
        <div role="tabpanel" id="panel-visualizer" aria-labelledby="tab-visualizer">
          <AlgorithmVisualizer trace={visualizationTrace} customPrompt={rawQuestion} />
        </div>
      )}

      {/* 1. PPT Slide Deck Mode */}
      {activeTab === 'ppt' && (
        <div role="tabpanel" id="panel-ppt" aria-labelledby="tab-ppt">
          <SlideDeckView
            rawQuestion={rawQuestion}
            refinedPrompt={refinedPrompt}
            explanation={explanation}
            keyPoints={keyPoints}
            slides={slides}
            chartData={chartData}
            subjectTag={subjectTag}
            hasVisualizer={hasTrace}
            onOpenVisualizer={() => setActiveTab('visualizer')}
          />
        </div>
      )}

      {/* 2. Full Technical Document Mode */}
      {activeTab === 'full' && (
        <div
          role="tabpanel"
          id="panel-full"
          aria-labelledby="tab-full"
          className="panel-elevated p-6 sm:p-8 space-y-6 border border-slate-800"
        >
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white leading-tight capitalize">
            {rawQuestion}
          </h2>

          {refinedPrompt && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
              <button
                onClick={() => setShowRefinedPrompt(!showRefinedPrompt)}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-mono font-bold text-blue-300 hover:bg-blue-500/10 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Refined Prompt Spec
                </span>
                {showRefinedPrompt
                  ? <ChevronUp className="w-4 h-4 text-blue-400" />
                  : <ChevronDown className="w-4 h-4 text-blue-400" />}
              </button>
              {showRefinedPrompt && (
                <div className="px-3.5 pb-3.5 animate-fade-in">
                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#080c14] p-3 rounded-lg border border-slate-800">
                    "{refinedPrompt}"
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="prose-dark max-w-none">
            <ReactMarkdown>{explanation}</ReactMarkdown>
            {isStreaming && <span className="cursor-blink" />}
          </div>

          {keyPoints?.length > 0 && (
            <div className="rounded-xl bg-[#0a0f1a] border border-slate-800 p-5 space-y-3">
              <h4 className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> key takeaways
              </h4>
              <ul className="space-y-2.5">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-1 w-5 h-5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {chartData && (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0a0f1a] p-4">
              <ChartView chartData={chartData} />
            </div>
          )}
        </div>
      )}

      {/* 3. ELI5 Mode */}
      {activeTab === 'simplified' && (
        <div
          role="tabpanel"
          id="panel-simplified"
          aria-labelledby="tab-simplified"
          className="panel-elevated p-6 sm:p-8 space-y-4 border border-purple-500/25 animate-fade-in"
        >
          <div className="flex items-center gap-2 text-purple-300 font-display font-bold text-sm">
            <Baby className="w-5 h-5 text-purple-400" />
            <span>intuitive conceptual model</span>
          </div>
          {isSimplifying ? (
            <div className="py-8 text-center text-xs font-mono text-purple-300 animate-pulse">
              Translating formal abstractions into conceptual models...
            </div>
          ) : (
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {simplified || 'Simplified version ready.'}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CONVERSATION THREAD (FOLLOW-UP MESSAGES)
         ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5 pt-4">
        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[11px] font-mono text-slate-400 px-3 py-1 rounded-md bg-[#0a0f1a] border border-slate-800 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>discussion thread</span>
          </span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Existing Follow-up Messages */}
        {followUps && followUps.length > 0 && (
          <div className="space-y-4">
            {followUps.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-up`}
              >
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm font-mono text-xs font-bold">
                    C
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-xl p-5 ${
                    msg.role === 'user'
                      ? 'bg-[#182238] text-white border border-blue-500/30'
                      : 'panel-elevated border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose-dark max-w-none text-sm space-y-3">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.slides && msg.slides.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ppt');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                      >
                        <Presentation className="w-3.5 h-3.5" />
                        <span>View Interactive Slides ({msg.slides.length} slides)</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 block text-right mt-2 font-mono">
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#141d2e] border border-slate-700/60 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Follow-up Streaming Bubble */}
        {isFollowUpStreaming && (
          <div className="flex gap-3.5 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm font-mono text-xs font-bold">
              C
            </div>

            <div className="max-w-[85%] rounded-xl p-5 panel-elevated border border-blue-500/30 text-slate-200">
              {currentFollowUpChunk ? (
                <div className="prose-dark max-w-none text-sm">
                  <ReactMarkdown>{currentFollowUpChunk}</ReactMarkdown>
                  <span className="cursor-blink" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Clario is synthesizing technical response...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Anchor for auto-scroll */}
        <div ref={threadEndRef} />

        {/* Follow-up input bar & smart chips */}
        {!isStreaming && (
          <div className="panel-elevated p-4 sm:p-5 border border-slate-800 space-y-3">
            {/* Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shrink-0 font-medium">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                suggested inquiries:
              </span>
              {suggestionPills.map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isFollowUpStreaming}
                  onClick={() => handleSuggestionClick(pill)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#101726] hover:bg-[#162035] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendFollowUp} className="relative flex items-center gap-2">
              <label htmlFor="followup-input" className="sr-only">
                Ask a follow-up question
              </label>
              <input
                id="followup-input"
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder="Inquire further on this concept... (e.g., 'Show tail-call optimization in C', 'Explain cache effects')"
                disabled={isFollowUpStreaming}
                className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 text-xs sm:text-sm rounded-lg px-4 py-2.5 pr-12 transition-colors font-sans"
              />

              <button
                type="submit"
                disabled={!followUpInput.trim() || isFollowUpStreaming}
                className="btn-primary absolute right-1.5 w-8 h-8 p-0 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send follow-up"
                aria-label="Send follow-up"
              >
                {isFollowUpStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      <ShortsModal
        isOpen={isShortsOpen}
        onClose={() => setIsShortsOpen(false)}
        topic={shortsTopic}
        prompt={rawQuestion || ''}
      />
      <StudyListModal
        isOpen={isStudyListOpen}
        onClose={() => setIsStudyListOpen(false)}
        questionId={questionId}
        questionTitle={rawQuestion}
      />
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        questionId={questionId}
        questionTitle={rawQuestion}
      />
    </div>
  );
};
