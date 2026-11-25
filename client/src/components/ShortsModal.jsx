import React, { useState, useEffect, useRef, useCallback } from 'react';
import useShorts from '../hooks/useShorts.js';
import ShortCard from './ShortCard.jsx';
import { X, RefreshCw, AlertCircle, ChevronUp, ChevronDown, Video, Sparkles } from 'lucide-react';

export const ShortsModal = ({ isOpen, onClose, topic, prompt = '' }) => {
  const cleanTopic = (topic || '').slice(0, 100).trim();
  const cleanPrompt = (prompt || '').slice(0, 200).trim();
  const { shorts, loading, error, isRateLimited, isCached, refetch } = useShorts(
    isOpen ? cleanTopic : null,
    isOpen ? (cleanPrompt || cleanTopic) : ''
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  // Default to unmuted (sound on)
  const [isMuted, setIsMuted] = useState(false);
  const feedContainerRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);

  // Keep ref synchronized
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Smoothly scroll to a specific card index
  const scrollToCard = useCallback((targetIndex) => {
    if (!feedContainerRef.current || !shorts || shorts.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, shorts.length - 1));
    const card = feedContainerRef.current.querySelector(`[data-index="${clampedIndex}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentIndex(clampedIndex);
    }
  }, [shorts]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToCard(currentIndexRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToCard(currentIndexRef.current - 1);
      } else if (e.key === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, scrollToCard]);

  // Reset index when topic or prompt changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [cleanTopic, cleanPrompt]);

  // IntersectionObserver to detect currently visible short card
  useEffect(() => {
    if (!isOpen || !feedContainerRef.current || !shorts || shorts.length === 0) return;

    const container = feedContainerRef.current;
    const cards = container.querySelectorAll('[data-index]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) {
              setCurrentIndex(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [isOpen, shorts]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shorts-modal-title"
      className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden w-full h-[100dvh] h-screen animate-fade-in select-none"
    >
      {/* Floating Top Overlay Header */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-4 sm:px-6 pt-3.5 pb-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shorts modal"
            className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 id="shorts-modal-title" className="font-display text-sm sm:text-base font-bold text-white tracking-tight drop-shadow-md">
                Shorts Feed
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-md">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> AI Decided
              </span>
              {isCached && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                  ⚡ Cached
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-300 truncate max-w-[200px] sm:max-w-md drop-shadow">
              {cleanPrompt ? cleanPrompt : cleanTopic || 'Computer Science'}
            </p>
          </div>
        </div>

        {/* Action Controls & Counter */}
        <div className="flex items-center space-x-2 sm:space-x-3 pointer-events-auto">
          {shorts.length > 0 && (
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md shadow-md tabular-nums">
              {currentIndex + 1} / {shorts.length}
            </span>
          )}
        </div>
      </div>

      {/* Main Full-Page Reel Viewport */}
      <div className="relative w-full h-full flex-1 overflow-hidden bg-black flex items-center justify-center">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-3 z-10">
            <RefreshCw className="w-9 h-9 text-blue-500 animate-spin" />
            <p className="text-xs font-mono text-slate-300 animate-pulse drop-shadow">
              Curating high-signal shorts for your prompt...
            </p>
          </div>
        )}

        {/* Error / Rate Limit State */}
        {!loading && error && (
          <div className="max-w-md mx-4 p-6 sm:p-8 rounded-2xl bg-[#0a0f1a]/95 border border-slate-800 text-center space-y-4 shadow-2xl z-10 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white">
                {isRateLimited ? 'Daily Shorts Limit Reached' : 'Unable to Load Shorts'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{error}</p>
            </div>
            {isRateLimited ? (
              <p className="text-xs font-mono text-slate-500">
                Limit: 30 shorts per day. Your quota resets at midnight UTC.
              </p>
            ) : (
              <button
                type="button"
                onClick={refetch}
                className="btn-primary text-xs"
              >
                Retry Search
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && shorts.length === 0 && (
          <div className="max-w-md mx-4 p-6 sm:p-8 rounded-2xl bg-[#0a0f1a]/95 border border-slate-800 text-center space-y-3 shadow-2xl z-10 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white">No Shorts Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                No short-form educational videos matched this specific concept query.
              </p>
            </div>
            <button
              type="button"
              onClick={refetch}
              className="btn-secondary text-xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 100vh Full-Page Vertical Feed Container */}
        {!loading && !error && shorts.length > 0 && (
          <div
            ref={feedContainerRef}
            className="w-full h-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col items-center bg-black"
          >
            {shorts.map((short, index) => (
              <ShortCard
                key={short.videoId || index}
                short={short}
                index={index}
                currentIndex={currentIndex}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((prev) => !prev)}
              />
            ))}
          </div>
        )}

        {/* Vertical Scroll Hint Floating Buttons (Desktop) */}
        {!loading && !error && shorts.length > 1 && (
          <div className="hidden md:flex flex-col space-y-3 absolute right-6 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={() => scrollToCard(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Previous short (Up Arrow / K)"
              className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollToCard(currentIndex + 1)}
              disabled={currentIndex === shorts.length - 1}
              aria-label="Next short (Down Arrow / J)"
              className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Subtle Bottom Navigation Tip (Fades out after user scrolls) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[11px] font-mono text-slate-400 bg-black/60 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm hidden sm:block">
          Use ↑ / ↓ arrow keys or scroll to flip reels · M to toggle sound
        </div>
      </div>
    </div>
  );
};

export default ShortsModal;
