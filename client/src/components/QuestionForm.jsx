import React, { useState } from 'react';
import { Send, Terminal, Loader2, ArrowUpRight, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  { label: 'Recursion Call Stack & Memory', query: 'explain recursion and the call stack in memory' },
  { label: 'C vs Python Architecture', query: 'what is the difference between C and Python' },
  { label: 'Quicksort vs Mergesort', query: 'compare quicksort and mergesort time complexity & stability' },
  { label: 'Virtual Memory & Page Tables', query: 'how does virtual memory and page table work in OS' },
  { label: 'Linux Gaming Distros & Proton', query: 'which is the best distro for gaming' },
  { label: "Dijkstra's Shortest Path", query: 'explain dijkstra shortest path algorithm with steps' },
];

export const QuestionForm = ({ onSubmit, isLoading, status }) => {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmit(question.trim());
  };

  const handleSuggestionClick = (query) => {
    setQuestion(query);
    if (!isLoading) onSubmit(query);
  };

  const charCount = question.length;
  const isNearLimit = charCount > 850;
  const showCounter = charCount > 400;

  return (
    <div className="panel-elevated overflow-hidden transition-all duration-200">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0a0f1a]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            Query Console // First-Principles Analysis
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 hidden sm:inline-block">
            Markdown · Slides · Charts · Shorts
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="question-input" className="sr-only">
              Ask any engineering concept or algorithm question
            </label>
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Inquire on any computer science concept, systems architecture, or algorithm (e.g. 'Compare Quicksort vs Mergesort', 'How does Virtual Memory work?')..."
              rows={3}
              disabled={isLoading}
              maxLength={1000}
              className="w-full bg-[#080c14] text-slate-100 placeholder:text-slate-500 text-sm sm:text-base rounded-xl p-4 pr-16 resize-none border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed font-sans"
              style={{ minHeight: '96px' }}
            />

            {/* Character counter */}
            {showCounter && (
              <span
                className={`absolute bottom-3 left-4 text-[10px] font-mono tabular-nums ${
                  isNearLimit ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                {charCount} / 1000 chars
              </span>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              aria-label="Submit Question"
              className="btn-primary absolute right-3 bottom-3 w-10 h-10 p-0 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Quick Benchmark Prompt Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" /> Curated Inquiries
              </span>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Enter</kbd> to analyze
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSuggestionClick(item.query)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#101726] hover:bg-[#162035] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-40 group text-left"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse w-full" />
        </div>
      )}
    </div>
  );
};
