import React from 'react';
import { Volume2, VolumeX, ExternalLink, Clock, Play } from 'lucide-react';

export const ShortCard = ({
  short,
  index,
  currentIndex,
  isMuted,
  onToggleMute,
}) => {
  const isActive = index === currentIndex;
  // Performance optimization: only mount iframe for current card ± 1 card
  const isMounted = Math.abs(index - currentIndex) <= 1;

  // Clean, compatible YouTube embed URL with unmuted support
  const embedUrl = `https://www.youtube.com/embed/${short.videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0`;

  return (
    <div
      data-index={index}
      className="h-[100dvh] h-screen w-full snap-start snap-always flex-shrink-0 flex items-center justify-center select-none relative overflow-hidden bg-black"
    >
      <div className="w-full h-full sm:max-w-[460px] md:max-w-[480px] aspect-[9/16] bg-black sm:border-x sm:border-slate-800/60 relative flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Video / Player Area */}
        <div className="absolute inset-0 bg-black">
          {isMounted ? (
            <iframe
              className="w-full h-full object-cover border-0"
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

        {/* Top Badges & Audio Control */}
        <div className="relative z-10 pt-16 sm:pt-20 px-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-red-600 text-white flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              SHORTS
            </span>
            {short.durationSec ? (
              <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-black/70 text-slate-200 border border-white/15 flex items-center gap-1 backdrop-blur-md shadow-md">
                <Clock className="w-3 h-3 text-slate-400" />
                {short.durationSec}s
              </span>
            ) : null}
          </div>

          {/* Prominent Sound Toggle Pill */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border backdrop-blur-md transition-all active:scale-95 shadow-lg ${
              isMuted
                ? 'bg-black/75 text-amber-300 border-amber-500/40 hover:bg-black/90'
                : 'bg-black/75 text-emerald-400 border-emerald-500/40 hover:bg-black/90'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Sound On</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Metadata & External Link Overlay */}
        <div className="relative z-10 p-4 pb-6 sm:pb-8 pt-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto">
          <div className="space-y-1.5 mb-3">
            <p className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {short.channel}
            </p>
            <h3 className="font-display text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
              {short.title}
            </h3>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Reel {index + 1}
            </span>
            <a
              href={`https://www.youtube.com/shorts/${short.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch on YouTube"
              className="text-xs font-mono font-semibold text-white flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortCard;
