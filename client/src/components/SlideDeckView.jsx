import React, { useState, useEffect, useCallback } from 'react';
import { TagBadge } from './TagBadge';
import { ChartView } from './ChartView';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  CheckCircle2,
  Brain,
  Lightbulb,
  Zap,
  Layers,
  ArrowRight,
  Code2,
  BarChart3,
  Award,
  AlertTriangle,
  Flame,
  Check,
  Activity,
} from 'lucide-react';

export const SlideDeckView = ({
  rawQuestion,
  refinedPrompt,
  explanation,
  keyPoints = [],
  chartData,
  subjectTag,
  slides: modelSlides = [],
  hasVisualizer = false,
  onOpenVisualizer,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Only render if custom structured slides were generated
  const activeSlides = React.useMemo(() => {
    if (Array.isArray(modelSlides) && modelSlides.length > 0) {
      return modelSlides;
    }
    return [];
  }, [modelSlides]);

  if (!activeSlides || activeSlides.length === 0) {
    return null;
  }

  const totalSlides = activeSlides.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.target.matches('textarea, input'))) {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key.toLowerCase() === 'f' && !e.target.matches('textarea, input')) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen]);

  const slide = activeSlides[currentSlide] || activeSlides[0];

  return (
    <div
      role="region"
      aria-label="Structured Concept Slide Deck"
      className={`relative transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#080c14] p-6 sm:p-10 flex flex-col justify-between overflow-y-auto'
          : 'panel-elevated overflow-hidden border border-slate-800'
      }`}
    >
      {/* ── Slide Header Toolbar ── */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-slate-800/80 bg-[#0a0f1a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Structured Concept Deck</span>
          </div>
          {slide?.badge && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700/60 hidden sm:inline">
              {slide.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasVisualizer && onOpenVisualizer && (
            <button
              onClick={onOpenVisualizer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
              title="Launch interactive algorithm visualizer"
            >
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Interactive Visualizer</span>
            </button>
          )}

          {/* Slide counter */}
          <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700/60 tabular-nums">
            {currentSlide + 1} / {totalSlides}
          </span>

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Present Fullscreen (F)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Present Fullscreen'}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Slide Canvas ── */}
      <div className={`p-6 sm:p-10 flex-1 flex flex-col justify-center min-h-[420px] ${isFullscreen ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div key={currentSlide} className="space-y-6 animate-fade-in">
          {/* Slide Meta Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                {slide.badge || `Slide ${currentSlide + 1}`}
              </span>
              {subjectTag && <TagBadge tag={subjectTag} size="xs" />}
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {slide.title}
            </h2>

            {slide.subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl font-sans">
                {slide.subtitle}
              </p>
            )}
          </div>

          {/* Core Concept Key Insight Banner */}
          {slide.keyConcept && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 shrink-0 mt-0.5">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-amber-300 block text-xs font-mono uppercase tracking-wider mb-0.5 font-bold">
                  Core Architectural Insight
                </strong>
                {slide.keyConcept}
              </div>
            </div>
          )}

          {/* Process Flow Diagram (If slide has processSteps) */}
          {slide.processSteps && slide.processSteps.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Execution Pipeline & State Transitions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {slide.processSteps.slice(0, 3).map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0a0f1a] border border-slate-800 hover:border-blue-500/30 transition-colors flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bullet Points Grid */}
          {slide.bulletPoints && slide.bulletPoints.length > 0 && (
            <div className={`grid gap-3 ${slide.bulletPoints.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {slide.bulletPoints.map((bp, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#0a0f1a] border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-xs font-bold text-white truncate pr-2">{bp.heading}</h4>
                    {bp.tag && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700/80">
                        {bp.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{bp.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Code Snippet or Formula (If provided) */}
          {slide.codeOrFormula && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-blue-400" /> Formal Syntax / Formula
                </span>
              </div>
              <pre className="p-4 rounded-xl bg-[#060910] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                <code>{slide.codeOrFormula}</code>
              </pre>
            </div>
          )}

          {/* Embedded Chart (If layout is 'chart' and chartData exists) */}
          {slide.layout === 'chart' && chartData && (
            <div className="bg-[#0a0f1a] p-4 rounded-xl border border-slate-800">
              <ChartView chartData={chartData} />
            </div>
          )}

          {/* Callout Card (Warning, Tip, Insight) */}
          {slide.callout && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                slide.callout.type === 'warning'
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
                  : slide.callout.type === 'tip'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
              }`}
            >
              {slide.callout.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : slide.callout.type === 'tip' ? (
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="block mb-0.5 font-bold font-sans">
                  {slide.callout.title}
                </strong>
                {slide.callout.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide Footer Controls ── */}
      <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800/80 bg-[#0a0f1a] flex items-center justify-between gap-4">
        {/* Slide Indicator Dots */}
        <div
          role="tablist"
          aria-label="Slide sequence indicators"
          className="flex items-center gap-1.5"
        >
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={currentSlide === idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                currentSlide === idx
                  ? 'w-6 bg-amber-400'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Slide ${idx + 1} of ${totalSlides}`}
              aria-label={`Go to slide ${idx + 1} of ${totalSlides}`}
            />
          ))}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            aria-label="Previous slide (Left Arrow or PageUp)"
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            type="button"
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            aria-label="Next slide (Right Arrow or Space or PageDown)"
            className="btn-primary text-xs py-1.5 px-3.5 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
