import React, { useEffect, useRef, useState } from 'react';
import { PHOTOGRAPHIC_SLIDESHOW_IMAGES } from '../../data/photographicSlideshow';
import { PhotographicThemeId } from '../../types/oppsift';

export interface PhotographicBackdropProps {
  initialTheme?: PhotographicThemeId;
  overlayTone?: 'burgundy' | 'navy' | 'burgundy-navy';
  minHeightClass?: string;
  className?: string;
  intervalMs?: number;
  children?: React.ReactNode;
}

const CROSSFADE_DURATION_MS = 1400;

/**
 * Continuous photographic sequence. The collection is the approved slideshow
 * asset set (see src/ui/data/photographicSlideshow.ts); every image is an
 * attributed, licensed photograph of a trade, infrastructure or market subject.
 * Motion stops completely when the visitor prefers reduced motion.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export function PhotographicBackdrop({
  initialTheme,
  overlayTone = 'burgundy-navy',
  minHeightClass = '',
  className = '',
  intervalMs = 7000,
  children,
}: PhotographicBackdropProps) {
  const photos = PHOTOGRAPHIC_SLIDESHOW_IMAGES;
  const total = photos.length;
  const prefersReducedMotion = usePrefersReducedMotion();

  const initialIdx = React.useMemo(() => {
    if (!initialTheme || total === 0) return 0;
    const match = photos.findIndex((p) => p.theme === initialTheme);
    return match >= 0 ? match : 0;
  }, [initialTheme, photos, total]);

  const [stableIndex, setStableIndex] = useState<number>(initialIdx);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [incomingVisible, setIncomingVisible] = useState<boolean>(false);
  const [baseLoaded, setBaseLoaded] = useState<boolean>(false);

  const failedIndicesRef = useRef<Set<number>>(new Set());
  const stableIndexRef = useRef<number>(stableIndex);
  stableIndexRef.current = stableIndex;

  // Reset starting index when navigating to a page with a different initial theme
  useEffect(() => {
    setStableIndex(initialIdx);
    setIncomingIndex(null);
    setIncomingVisible(false);
  }, [initialIdx]);

  // Preload only the next two photographs. The full collection is never
  // downloaded up front: the first image is requested by the <img> element and
  // each later frame is fetched shortly before it is needed.
  useEffect(() => {
    if (total <= 1 || typeof window === 'undefined' || prefersReducedMotion) return;
    const preloadOffsets = [1, 2];
    const preloaders: HTMLImageElement[] = [];

    for (const offset of preloadOffsets) {
      const idx = (stableIndex + offset) % total;
      const asset = photos[idx];
      if (!asset || failedIndicesRef.current.has(idx)) continue;
      const img = new window.Image();
      img.referrerPolicy = 'no-referrer';
      img.src = asset.imageUrl;
      preloaders.push(img);
    }

    return () => {
      for (const img of preloaders) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [stableIndex, photos, total, prefersReducedMotion]);

  // Automatic indefinite slideshow loop (~7s per photograph, wrapping the
  // collection back to the first image). No controls are rendered.
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (total <= 1 || typeof window === 'undefined') return;

    let cancelled = false;
    let settleTimer: number | null = null;
    let rafId: number | null = null;

    const advanceToNextLoaded = (candidateOffset = 1) => {
      if (cancelled || candidateOffset > total) return;
      const targetIdx = (stableIndexRef.current + candidateOffset) % total;

      if (failedIndicesRef.current.has(targetIdx)) {
        advanceToNextLoaded(candidateOffset + 1);
        return;
      }

      const targetAsset = photos[targetIdx];
      if (!targetAsset) return;

      const loader = new window.Image();
      loader.referrerPolicy = 'no-referrer';

      loader.onload = () => {
        if (cancelled) return;
        setIncomingIndex(targetIdx);
        setIncomingVisible(false);

        rafId = window.requestAnimationFrame(() => {
          rafId = window.requestAnimationFrame(() => {
            if (!cancelled) {
              setIncomingVisible(true);
            }
          });
        });

        settleTimer = window.setTimeout(() => {
          if (cancelled) return;
          setStableIndex(targetIdx);
          setIncomingIndex(null);
          setIncomingVisible(false);
          setBaseLoaded(true);
        }, CROSSFADE_DURATION_MS + 60);
      };

      loader.onerror = () => {
        if (cancelled) return;
        failedIndicesRef.current.add(targetIdx);
        advanceToNextLoaded(candidateOffset + 1);
      };

      loader.src = targetAsset.imageUrl;
    };

    const intervalId = window.setInterval(() => {
      advanceToNextLoaded(1);
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [photos, total, intervalMs, prefersReducedMotion]);

  const stablePhoto = photos[stableIndex];
  const incomingPhoto = incomingIndex !== null ? photos[incomingIndex] : null;

  const handleBaseError = () => {
    failedIndicesRef.current.add(stableIndex);
    if (total > 1) {
      setStableIndex((prev) => (prev + 1) % total);
    }
  };

  // Subtle Burgundy Executive-compatible gradient overlay maintaining clear visibility & text contrast
  const scrimClass =
    overlayTone === 'navy'
      ? 'bg-gradient-to-r from-[#1A0D18]/75 via-[#0B1F3A]/42 to-[#0B1F3A]/20'
      : overlayTone === 'burgundy'
      ? 'bg-gradient-to-r from-[#251019]/78 via-[#3B1325]/42 to-[#251019]/20'
      : 'bg-gradient-to-r from-[#251019]/76 via-[#2E1121]/38 to-[#0B1F3A]/22';

  return (
    <div
      className={`relative overflow-hidden bg-[#1D0B14] text-white flex flex-col justify-center ${minHeightClass} ${className}`}
    >
      {/* Active settled photograph. It is the LCP element, so it is fetched
          eagerly and at high priority while the headline renders above it. */}
      {stablePhoto && (
        <img
          src={stablePhoto.imageUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          onLoad={() => setBaseLoaded(true)}
          onError={handleBaseError}
          className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-700 ease-out ${
            baseLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Smooth Crossfade Incoming Photograph Layer */}
      {incomingPhoto && (
        <img
          key={incomingPhoto.id}
          src={incomingPhoto.imageUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-[1400ms] ease-in-out ${
            incomingVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Subtle Dark Burgundy Overlay for Foreground Readability */}
      <div className={`absolute inset-0 ${scrimClass} pointer-events-none`} aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#180A11]/55 via-transparent to-[#180A11]/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Foreground Page Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center [text-shadow:0_1px_12px_rgba(0,0,0,0.65)]">
        {children}
      </div>
    </div>
  );
}
