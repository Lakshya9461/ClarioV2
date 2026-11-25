import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import useShorts from '../hooks/useShorts.js';
import {
  ArrowLeft,
  Search,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Repeat,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Video,
  Play,
  Check,
  Flame,
} from 'lucide-react';

export const Shorts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract topic & prompt from query params (default to best-distro-for-gaming or computer science)
  const initialTopic = searchParams.get('topic') || 'best-distro-for-gaming';
  const initialPrompt = searchParams.get('prompt') || 'which is the best distro for gaming';

  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const [activePrompt, setActivePrompt] = useState(initialPrompt);
  const [searchInput, setSearchInput] = useState(initialPrompt || initialTopic);

  // Default to unmuted sound (mute=0)
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedReels, setLikedReels] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);

  const feedContainerRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);

  const { shorts, loading, error, isRateLimited, isCached, refetch } = useShorts(
    activeTopic,
    activePrompt
  );

  // Sync ref
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Handle URL query updates
  useEffect(() => {
    const t = searchParams.get('topic');
    const p = searchParams.get('prompt');
    if (t || p) {
      if (t) setActiveTopic(t);
      if (p) {
        setActivePrompt(p);
        setSearchInput(p);
      }
      setCurrentIndex(0);
    }
  }, [searchParams]);

  // Smoothly scroll to card index
  const scrollToCard = useCallback((targetIndex) => {
    if (!feedContainerRef.current || !shorts || shorts.length === 0) return;
    const clamped = Math.max(0, Math.min(targetIndex, shorts.length - 1));
    const card = feedContainerRef.current.querySelector(`[data-reel-index="${clamped}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentIndex(clamped);
    }
  }, [shorts]);

  // Keyboard navigation (Up/Down / j/k / m / l / Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in the search box
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToCard(currentIndexRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToCard(currentIndexRef.current - 1);
      } else if (e.key === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key === 'l') {
        e.preventDefault();
        const cur = currentIndexRef.current;
        setLikedReels((prev) => ({ ...prev, [cur]: !prev[cur] }));
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToCard, navigate]);

  // Detect currently visible reel using IntersectionObserver
  useEffect(() => {
    if (!feedContainerRef.current || !shorts || shorts.length === 0) return;

    const container = feedContainerRef.current;
    const cards = container.querySelectorAll('[data-reel-index]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-reel-index'));
            if (!isNaN(idx)) {
              setCurrentIndex(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [shorts]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchInput.trim()) return;
    const query = searchInput.trim();
    setActivePrompt(query);
    setActiveTopic(query);
    setCurrentIndex(0);
    setSearchParams({ topic: query, prompt: query });
  };

  // Quick concept tags
  const conceptTags = [
    { label: 'Gaming Distros', q: 'which is the best distro for gaming' },
    { label: 'Recursion', q: 'recursion in computer science' },
    { label: 'C vs Python', q: 'difference between C and Python' },
    { label: 'Binary Search Tree', q: 'binary search tree explained' },
    { label: 'Sorting Algorithms', q: 'quicksort algorithm explained' },
  ];

  const handleShare = (short, idx) => {
    const url = `https://www.youtube.com/shorts/${short.videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const toggleLike = (idx) => {
    setLikedReels((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Setup loop listener on YouTube iframe postMessage
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // YT.PlayerState.ENDED is 0
        if (data?.event === 'onStateChange' && data?.info === 0) {
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach((iframe) => {
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
              '*'
            );
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          });
        }
      } catch {
        // Ignore non-json iframe messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col w-full h-[100dvh] h-screen overflow-hidden select-none">
      {/* ── Top Header Navigation Bar ── */}
      <header className="relative z-30 w-full bg-[#070b12]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back & Branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back to Console"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
              <Video className="w-4 h-4 fill-white" />
            </div>
            <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1">
              Clario <span className="text-red-500 font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">Shorts</span>
            </span>
          </Link>
        </div>

        {/* Center: Search input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden md:flex items-center">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search concept shorts (e.g. recursion, linux gaming)..."
              className="w-full bg-[#0e1422] border border-slate-700/80 rounded-full pl-9 pr-14 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold transition-colors"
            >
              Curate
            </button>
          </div>
        </form>

        {/* Right: Badges & Global Mute Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? 'Turn Sound On' : 'Mute Sound'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border backdrop-blur-md transition-all active:scale-95 shadow-sm ${
              isMuted
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {isCached && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3 fill-emerald-400" /> Cached
            </span>
          )}

          {shorts.length > 0 && (
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700/80 tabular-nums">
              {currentIndex + 1} / {shorts.length}
            </span>
          )}
        </div>
      </header>

      {/* ── Subheader Concept Quick Chips (Desktop) ── */}
      <div className="relative z-20 bg-[#070b12]/80 backdrop-blur-sm border-b border-slate-800/40 px-4 py-1.5 hidden sm:flex items-center justify-between text-xs font-mono text-slate-400 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-500" /> Trending Topics:
          </span>
          {conceptTags.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => {
                setSearchInput(tag.q);
                setActivePrompt(tag.q);
                setActiveTopic(tag.q);
                setCurrentIndex(0);
                setSearchParams({ topic: tag.q, prompt: tag.q });
              }}
              className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-all ${
                activePrompt === tag.q
                  ? 'bg-red-600/20 text-red-300 border-red-500/40 font-bold'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-purple-400 font-semibold">
            <Sparkles className="w-3 h-3 text-purple-400" /> AI Curation Active
          </span>
        </div>
      </div>

      {/* ── Main Reel Viewport (100% Height, Vertical Feed) ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-4 z-20">
            <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 animate-pulse">
              <RefreshCw className="w-7 h-7 animate-spin text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-white text-base">Curating Live Shorts with AI</h3>
              <p className="text-xs font-mono text-slate-400 mt-1 max-w-xs">
                Searching YouTube for "{activePrompt.slice(0, 45)}..." and selecting the highest signal reels...
              </p>
            </div>
          </div>
        )}

        {/* Error / Rate Limit State */}
        {!loading && error && (
          <div className="max-w-md mx-4 p-8 rounded-2xl bg-[#0e1422] border border-slate-800 text-center space-y-4 shadow-2xl z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white">
                {isRateLimited ? 'Daily Shorts Quota Reached' : 'Unable to Load Shorts'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{error}</p>
            </div>
            {isRateLimited ? (
              <p className="text-xs font-mono text-slate-500">
                Daily quota: 30 shorts searches. Your limit resets at midnight UTC.
              </p>
            ) : (
              <button
                type="button"
                onClick={refetch}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Retry Search
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && shorts.length === 0 && (
          <div className="max-w-md mx-4 p-8 rounded-2xl bg-[#0e1422] border border-slate-800 text-center space-y-4 shadow-2xl z-20">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white">No Shorts Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                No short-form educational videos matched "{activePrompt}". Try searching another concept.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePrompt('best distro for gaming');
                setActiveTopic('best distro for gaming');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Show Gaming Distro Shorts
            </button>
          </div>
        )}

        {/* ── Vertical Shorts / Reels Snap Container ── */}
        {!loading && !error && shorts.length > 0 && (
          <div
            ref={feedContainerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col items-center bg-black"
          >
            {shorts.map((short, index) => {
              const isActive = index === currentIndex;
              const isMounted = Math.abs(index - currentIndex) <= 1;
              const isLiked = Boolean(likedReels[index]);

              // Continuous loop parameters: loop=1 & playlist=videoId & playsinline=1 & mute=...
              const embedUrl = `https://www.youtube.com/embed/${short.videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${short.videoId}&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1`;

              return (
                <div
                  key={short.videoId || index}
                  data-reel-index={index}
                  className="h-full w-full snap-start snap-always flex-shrink-0 flex items-center justify-center relative overflow-hidden bg-black select-none py-1 sm:py-2"
                >
                  {/* Central 9:16 Video Wrapper (Instagram / YouTube Shorts Desktop Layout) */}
                  <div className="w-full h-full sm:max-w-[420px] md:max-w-[440px] sm:rounded-2xl aspect-[9/16] bg-black sm:border sm:border-slate-800/80 relative flex flex-col justify-between overflow-hidden shadow-2xl">
                    {/* Video Player */}
                    <div className="absolute inset-0 bg-black">
                      {isMounted ? (
                        <iframe
                          className="w-full h-full object-cover border-0 absolute inset-0"
                          src={embedUrl}
                          title={short.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full relative">
                          <img
                            src={short.thumbnail}
                            alt={short.title}
                            className="w-full h-full object-cover opacity-60"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Top Overlay Badge & Looping Indicator */}
                    <div className="relative z-10 pt-4 px-4 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-red-600 text-white flex items-center gap-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          SHORTS
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-black/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-md">
                          <Repeat className="w-3 h-3 text-emerald-400 animate-spin-slow" />
                          Looping
                        </span>
                      </div>

                      {/* Sound Pill */}
                      <button
                        type="button"
                        onClick={() => setIsMuted((prev) => !prev)}
                        aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
                        className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border backdrop-blur-md transition-all active:scale-95 shadow-lg ${
                          isMuted
                            ? 'bg-black/75 text-amber-300 border-amber-500/40 hover:bg-black/90'
                            : 'bg-black/75 text-emerald-400 border-emerald-500/40 hover:bg-black/90'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{isMuted ? 'Muted' : 'Sound On'}</span>
                      </button>
                    </div>

                    {/* Right-Hand Social Action Bar (Like Instagram Reels / YouTube Shorts) */}
                    <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center space-y-4 pointer-events-auto">
                      {/* Like Button */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => toggleLike(index)}
                          aria-label={isLiked ? 'Unlike reel' : 'Like reel'}
                          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-75 shadow-lg ${
                            isLiked
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                        </button>
                        <span className="text-[11px] font-mono font-bold text-white mt-1 drop-shadow">
                          {isLiked ? 143 : 142}
                        </span>
                      </div>

                      {/* Sound Button */}
                      <button
                        type="button"
                        onClick={() => setIsMuted((prev) => !prev)}
                        aria-label="Toggle mute"
                        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-lg"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      </button>

                      {/* Share / Copy Link Button */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => handleShare(short, index)}
                          aria-label="Share reel"
                          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-lg"
                        >
                          {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        </button>
                        <span className="text-[10px] font-mono text-slate-300 mt-1 drop-shadow">
                          {copiedIndex === index ? 'Copied' : 'Share'}
                        </span>
                      </div>

                      {/* Watch on YouTube Link */}
                      <a
                        href={`https://www.youtube.com/shorts/${short.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch on YouTube"
                        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-300" />
                      </a>
                    </div>

                    {/* Bottom Metadata Overlay */}
                    <div className="relative z-10 p-4 pb-4 pt-16 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-auto pr-16">
                      <div className="space-y-1 mb-2">
                        <p className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          {short.channel}
                        </p>
                        <h3 className="font-display text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                          {short.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                        <span className="text-white font-semibold">#{activeTopic.toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                        <span>·</span>
                        <span>Reel {index + 1} of {shorts.length}</span>
                      </div>
                    </div>

                    {/* Bottom Animated Looping Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                      <div
                        className={`h-full bg-red-600 ${isActive ? 'animate-progress' : 'w-0'}`}
                        style={{
                          animationDuration: `${short.durationSec || 45}s`,
                          animationIterationCount: 'infinite',
                          animationTimingFunction: 'linear',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Desktop Floating Up/Down Navigation Arrows ── */}
        {!loading && !error && shorts.length > 1 && (
          <div className="hidden lg:flex flex-col space-y-3 absolute right-8 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={() => scrollToCard(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Previous Reel (Up Arrow / K)"
              className="p-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 hover:border-red-500/50"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollToCard(currentIndex + 1)}
              disabled={currentIndex === shorts.length - 1}
              aria-label="Next Reel (Down Arrow / J)"
              className="p-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 hover:border-red-500/50"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Subtle Keyboard Navigation Hint (Desktop) */}
        <div className="hidden sm:block absolute bottom-3 left-6 z-20 pointer-events-none text-[11px] font-mono text-slate-400 bg-black/60 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          <span>Use ↑ / ↓ arrow keys or scroll to flip reels · M to mute · L to like</span>
        </div>
      </div>
    </div>
  );
};

export default Shorts;
