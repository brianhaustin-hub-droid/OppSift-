import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, SkipForward } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { getPlaylistClips } from '../../data/cinematicMedia';
import { CinematicPlaylistId } from '../../types/oppsift';

export interface CinematicVideoBackdropProps {
  playlistIds: CinematicPlaylistId[];
  overlayTone?: 'burgundy' | 'navy' | 'burgundy-navy';
  minHeightClass?: string;
  className?: string;
  showControls?: boolean;
  initialIndex?: number;
  children?: React.ReactNode;
}

export function CinematicVideoBackdrop({
  playlistIds,
  overlayTone = 'burgundy-navy',
  minHeightClass = '',
  className = '',
  showControls = true,
  initialIndex = 0,
  children,
}: CinematicVideoBackdropProps) {
  const { reduceBackgroundMotion, setReduceBackgroundMotion } = useAppState();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clips = useMemo(() => getPlaylistClips(playlistIds), [playlistIds]);
  const [clipIndex, setClipIndex] = useState(() =>
    clips.length > 0 ? initialIndex % clips.length : 0
  );
  const [isVisible, setIsVisible] = useState(true);
  const [streamFailed, setStreamFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [prefersReducedOS, setPrefersReducedOS] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedOS(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeClip = clips[clipIndex % Math.max(1, clips.length)];
  const motionPaused = reduceBackgroundMotion || prefersReducedOS;
  const shouldPlayVideo = !motionPaused && isVisible && !streamFailed && Boolean(activeClip?.streamUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlayVideo) {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Browser autoplay policy fallback leaves verified poster visible
        });
      }
    } else {
      video.pause();
    }
  }, [shouldPlayVideo, activeClip?.id]);

  const handleNextClip = () => {
    if (clips.length <= 1) return;
    setStreamFailed(false);
    setPosterFailed(false);
    setClipIndex((prev) => (prev + 1) % clips.length);
  };

  const scrimClass =
    overlayTone === 'burgundy'
      ? 'bg-gradient-to-br from-[#1C0811]/92 via-[#3C1023]/84 to-[#160A15]/92'
      : overlayTone === 'navy'
      ? 'bg-gradient-to-br from-[#071426]/92 via-[#0B1F3A]/84 to-[#122D54]/90'
      : 'bg-gradient-to-br from-[#1B0912]/92 via-[#3A1124]/82 to-[#0B1F3A]/92';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#160B18] text-white flex flex-col justify-between ${minHeightClass} ${className}`}
    >
      {/* Verified Poster Image Base Layer (Zero-flash first paint + reduced-motion fallback) */}
      {activeClip && !posterFailed && (
        <img
          src={activeClip.posterUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setPosterFailed(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-55 select-none pointer-events-none"
        />
      )}

      {/* Single Active HTML5 Video Layer (Pauses offscreen & under reduced motion) */}
      {shouldPlayVideo && activeClip && (
        <video
          ref={videoRef}
          key={activeClip.id}
          src={activeClip.streamUrl}
          poster={activeClip.posterUrl}
          autoPlay
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onEnded={handleNextClip}
          onError={() => setStreamFailed(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-50 select-none pointer-events-none"
        />
      )}

      {/* Contrast-Verified Burgundy & Deep Navy Scrim */}
      <div className={`absolute inset-0 ${scrimClass}`} aria-hidden="true" />

      {/* Subtle Structural Grid Accent */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 flex-1">{children}</div>

      {/* Discreet Attribution & Motion Accessibility Controls */}
      {showControls && activeClip && (
        <div className="relative z-20 px-4 sm:px-6 lg:px-8 pb-3 flex flex-wrap items-center justify-end gap-2 text-[11px] text-white/80">
          <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-md bg-[#120812]/80 border border-white/15 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setReduceBackgroundMotion(!reduceBackgroundMotion)}
              aria-label={motionPaused ? 'Play background motion' : 'Pause background motion'}
              className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
            >
              {motionPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{motionPaused ? 'Motion Paused' : 'Pause'}</span>
            </button>
            <span aria-hidden="true" className="text-white/30">
              ·
            </span>
            <button
              type="button"
              onClick={handleNextClip}
              aria-label="Switch cinematic scene"
              className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
            >
              <SkipForward className="w-3 h-3" />
              <span>Next Scene</span>
            </button>
            <span aria-hidden="true" className="text-white/30 hidden sm:inline">
              ·
            </span>
            <a
              href={activeClip.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              title={`${activeClip.title} — ${activeClip.attributionText}`}
              className="hidden sm:inline-flex items-center gap-1 text-white/75 hover:text-white transition-colors max-w-[260px] truncate"
            >
              <span className="truncate">
                {activeClip.title} · {activeClip.licenseName}
              </span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
