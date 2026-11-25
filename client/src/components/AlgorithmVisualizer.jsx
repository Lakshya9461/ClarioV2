import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Code2,
  Activity,
  Layers,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  ArrowRight,
  GitGraph,
  Maximize2,
  Minimize2,
  Keyboard,
} from 'lucide-react';

export const AlgorithmVisualizer = ({ trace, customPrompt = '' }) => {
  if (!trace || !Array.isArray(trace.steps) || trace.steps.length === 0) {
    return (
      <div
        role="region"
        aria-label="Algorithm Visualizer Empty State"
        className="p-8 text-center text-slate-400 bg-[#080c14] rounded-2xl border border-slate-800"
      >
        <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-white">No Visualization Trace Available</p>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Ask an algorithm question (e.g. Quicksort, Binary Search, BFS, or Recursion) to generate a step-by-step visual trace.
        </p>
      </div>
    );
  }

  const { algorithm, title, category, complexity, pseudocode = [], steps = [] } = trace;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 1.5x, 2x
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const pseudocodeContainerRef = useRef(null);
  const codeLinesRef = useRef([]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentStepIndex, steps.length]);

  const handleNext = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handlePrev = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, []);

  const handleJumpToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(steps.length - 1);
  }, [steps.length]);

  // Global & scoped keyboard controls for playback & stepping
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept if user is typing in form controls
      if (e.target.matches('input, textarea, select')) return;

      if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleJumpToEnd();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, togglePlay, handleReset, handleJumpToEnd, isFullscreen]);

  // Playback timer loop
  useEffect(() => {
    let timer;
    if (isPlaying) {
      const delay = Math.max(300, Math.floor(1200 / playbackSpeed));
      timer = setTimeout(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const activeStep = steps[currentStepIndex] || steps[0];
  const { state = {}, description = '', codeLine = 0 } = activeStep;

  // Auto-scroll active pseudocode line into view smoothly
  useEffect(() => {
    if (codeLinesRef.current[codeLine]) {
      codeLinesRef.current[codeLine].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [codeLine]);

  // Max value calculation for array bar height normalization
  const maxArrayVal = useMemo(() => {
    if (!state.array || !Array.isArray(state.array)) return 100;
    const vals = state.array.map((x) => Number(x.value) || 0);
    return Math.max(...vals, 10);
  }, [state.array]);

  // Helper for status colors of array bars
  const getBarColor = (status) => {
    switch (status) {
      case 'comparing':
        return 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/40 animate-pulse';
      case 'swapping':
        return 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/50 scale-105';
      case 'pivot':
        return 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/40';
      case 'sorted':
        return 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30';
      case 'subrange':
        return 'bg-blue-500 text-white border-blue-400';
      case 'eliminated':
        return 'bg-slate-800 text-slate-500 opacity-30 border-slate-700';
      default:
        return 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600';
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={title || 'Algorithm Execution Visualizer'}
      className={`rounded-2xl border border-slate-800 bg-[#070b12] text-slate-200 overflow-hidden shadow-2xl transition-all focus:outline-none ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : 'w-full'
      }`}
    >
      {/* ── Top Header Bar ── */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0a0f1a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                {title || 'Algorithm Execution Visualizer'}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25 uppercase">
                {category || 'Algorithm'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Step {currentStepIndex + 1} of {steps.length} · {activeStep.state?.actionMessage || activeStep.description}
            </p>
          </div>
        </div>

        {/* Complexity Pills & Fullscreen */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          {complexity?.timeAvg && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Time: <strong className="text-white">{complexity.timeAvg}</strong></span>
            </div>
          )}
          {complexity?.space && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Space: <strong className="text-white">{complexity.space}</strong></span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Enter Fullscreen (F)'}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Interactive Split Screen ── */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
        {/* ── Left / Center: Visual Data Structure Canvas (Col 7) ── */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-[#060910] min-h-[380px] sm:min-h-[420px]">
          {/* Action Callout Banner */}
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4"
          >
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {activeStep.state?.action || 'RUNNING'}
              </span>
              <p className="text-xs sm:text-sm font-sans font-medium text-slate-200">
                {activeStep.description}
              </p>
            </div>
          </div>

          {/* 1. Array / Sorting View */}
          {state.array && Array.isArray(state.array) && (
            <div className="flex-1 flex flex-col justify-end items-center my-4">
              <div className="w-full flex items-end justify-center gap-2 sm:gap-3 px-2 h-52 sm:h-64">
                {state.array.map((item, idx) => {
                  const heightPercent = Math.max(15, Math.min(100, (item.value / maxArrayVal) * 100));
                  return (
                    <div key={idx} className="flex-1 max-w-[48px] flex flex-col items-center justify-end h-full group">
                      {/* Value label */}
                      <span className="text-xs font-mono font-bold text-white mb-1.5 drop-shadow">
                        {item.value}
                      </span>

                      {/* Bar element */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg border transition-all duration-300 flex items-center justify-center font-mono text-xs font-bold ${getBarColor(
                          item.status
                        )}`}
                      >
                        <span className="hidden sm:inline opacity-80 text-[10px]">{item.status === 'pivot' ? 'P' : ''}</span>
                      </div>

                      {/* Index label below */}
                      <span className="text-[10px] font-mono text-slate-500 mt-2">
                        [{item.index ?? idx}]
                      </span>

                      {/* Pointer badges (low, high, pivot, i, j) */}
                      <div className="h-5 mt-1 flex flex-wrap items-center justify-center gap-1">
                        {state.pointers?.low === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-blue-600 text-white rounded">low</span>
                        )}
                        {state.pointers?.high === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-rose-600 text-white rounded">high</span>
                        )}
                        {state.pointers?.pivot === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-purple-600 text-white rounded">piv</span>
                        )}
                        {state.pointers?.mid === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-amber-500 text-black rounded">mid</span>
                        )}
                        {state.pointers?.i === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-indigo-500 text-white rounded">i</span>
                        )}
                        {state.pointers?.j === idx && (
                          <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-emerald-500 text-white rounded">j</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-6 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-700" /> Default</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Comparing</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Swapping</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-600" /> Pivot</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Sorted</span>
              </div>
            </div>
          )}

          {/* 2. Recursion / Call Stack View */}
          {activeStep.callStack && (
            <div className="flex-1 flex flex-col justify-center my-4 p-4 rounded-xl bg-[#0a0f1a] border border-slate-800">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-purple-400 font-bold uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Runtime Call Stack (Depth: {activeStep.callStack.length})
                </span>
                <span className="text-[10px] text-slate-500">LIFO Execution Context</span>
              </div>

              {activeStep.callStack.length === 0 ? (
                <div className="py-8 text-center text-slate-600 font-mono text-xs">
                  Stack empty. Execution completed.
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 max-h-56 overflow-y-auto no-scrollbar">
                  {activeStep.callStack.map((frame, fIdx) => {
                    const isTop = fIdx === activeStep.callStack.length - 1;
                    return (
                      <div
                        key={fIdx}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all font-mono text-xs ${
                          isTop
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-[1.01]'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isTop ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="font-bold">{frame.fn || 'function'}({frame.arg ?? frame.args})</span>
                        </div>
                        <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {isTop ? 'Active Frame' : 'Suspended'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Graph View (BFS / DFS) */}
          {state.graphNodes && Array.isArray(state.graphNodes) && (
            <div className="flex-1 flex flex-col justify-center my-4 p-4 rounded-xl bg-[#0a0f1a] border border-slate-800">
              <div className="flex items-center justify-between mb-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider">
                  <GitGraph className="w-4 h-4 text-blue-400" /> Graph Traversal Nodes
                </span>
                {state.queue && (
                  <span className="text-amber-400">Queue (FIFO): [{state.queue.join(', ')}]</span>
                )}
                {state.stack && (
                  <span className="text-purple-400">Stack (LIFO): [{state.stack.join(', ')}]</span>
                )}
              </div>

              {/* Node Grid representation */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 py-4">
                {state.graphNodes.map((node) => {
                  const isCurrent = node.status === 'current';
                  const isVisited = node.status === 'visited';
                  const isQueued = node.status === 'queued' || node.status === 'stacked';

                  return (
                    <div
                      key={node.id}
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-500/40 scale-105'
                          : isVisited
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                          : isQueued
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="font-display font-bold text-lg">{node.id}</span>
                      <span className="text-[9px] font-mono uppercase mt-0.5">
                        {node.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Visited Set: <strong>{`{${(state.visited || []).join(', ')}}`}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Pseudocode & Step Engine (Col 5) ── */}
        <div className="lg:col-span-5 p-5 sm:p-6 bg-[#080d17] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                <Code2 className="w-4 h-4 text-blue-400" /> Active Pseudocode
              </span>
              <span className="text-[11px] font-mono text-slate-500">Line {codeLine + 1}</span>
            </div>

            {/* Pseudocode Editor Line-by-Line */}
            <div
              ref={pseudocodeContainerRef}
              tabIndex={0}
              role="region"
              aria-label="Synchronized Pseudocode Engine"
              className="bg-[#05080f] rounded-xl border border-slate-800/80 p-3.5 font-mono text-xs overflow-x-auto max-h-72 overflow-y-auto no-scrollbar space-y-1 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {pseudocode.map((line, lIdx) => {
                const isActiveLine = lIdx === codeLine;
                return (
                  <div
                    key={lIdx}
                    ref={(el) => (codeLinesRef.current[lIdx] = el)}
                    className={`flex items-center px-2 py-1 rounded transition-colors ${
                      isActiveLine
                        ? 'bg-blue-600/25 border-l-2 border-blue-400 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-6 shrink-0 text-slate-600 select-none text-[10px] tabular-nums">
                      {lIdx + 1}
                    </span>
                    <span className="flex-1 whitespace-pre">{line}</span>
                    {isActiveLine && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping ml-2 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Detail Card */}
          <div className="mt-5 p-4 rounded-xl bg-[#0e1422] border border-slate-800">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider block mb-1">
              Pedagogical Insight
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {activeStep.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Bar ── */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-[#0a0f1a] flex flex-wrap items-center justify-between gap-3">
        {/* Playback Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            onClick={handleReset}
            title="Reset to step 0 (Home)"
            aria-label="Reset to step 0 (Home)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            title="Previous step (Left Arrow or H)"
            aria-label="Previous step (Left Arrow or H)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause animation (Space or K)' : 'Play animation (Space or K)'}
            aria-label={isPlaying ? 'Pause animation (Space or K)' : 'Play animation (Space or K)'}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1}
            title="Next step (Right Arrow or L)"
            aria-label="Next step (Right Arrow or L)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleJumpToEnd}
            title="Jump to final sorted state (End)"
            aria-label="Jump to final sorted state (End)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Step Scrubber Slider */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2 flex items-center space-x-3">
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={currentStepIndex}
            aria-label="Algorithm execution step scrubber"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={currentStepIndex + 1}
            aria-valuetext={`Step ${currentStepIndex + 1} of ${steps.length}: ${activeStep.state?.actionMessage || activeStep.description}`}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(Number(e.target.value));
            }}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          />
          <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>

        {/* Speed Selector & Keyboard Shortcut Hint */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500 text-[10px] hidden sm:inline">Speed:</span>
          {[0.5, 1, 1.5, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setPlaybackSpeed(spd)}
              aria-label={`Set speed to ${spd}x`}
              aria-pressed={playbackSpeed === spd}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                playbackSpeed === spd
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
          <span className="hidden lg:inline text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            {'Space: Play · ←/→: Step · F: Fullscreen'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmVisualizer;
