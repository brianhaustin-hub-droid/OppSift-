import React, { useState } from 'react';

export type LogoVariant =
  | 'primary-horizontal'
  | 'symbol'
  | 'compact'
  | 'dark-bg'
  | 'light-bg'
  | 'monochrome'
  | 'app-icon';

interface OppSiftLogoProps {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg';
  useUploadedEmblem?: boolean;
  className?: string;
}

const ATTACHED_LOGO_URL = '/assets/aistudio/Glossy_Global_Orbit_Monogram_Icon_3e3ef1d4.png';

export function OppSiftVectorSymbol({
  mode = 'color',
  size = 36,
}: {
  mode?: 'color' | 'on-dark' | 'monochrome';
  size?: number;
}) {
  const isMono = mode === 'monochrome';
  const ringStroke = isMono ? 'currentColor' : mode === 'on-dark' ? '#E8A4B5' : '#541B32';
  const sFill = isMono ? 'currentColor' : mode === 'on-dark' ? '#FFFFFF' : '#251019';
  const orbitStroke = isMono ? 'currentColor' : '#38BDF8';
  const coreFill = isMono ? 'currentColor' : '#A33B59';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Abstract OS orbital geometry */}
      <circle cx="30" cy="32" r="20" stroke={ringStroke} strokeWidth="5.5" strokeDasharray="96 28" strokeLinecap="round" />
      {/* Inner meridian globe geometry */}
      <circle cx="29" cy="32" r="10.5" stroke={coreFill} strokeWidth="2.2" />
      <ellipse cx="29" cy="32" rx="5" ry="10.5" stroke={coreFill} strokeWidth="1.6" />
      <line x1="18.5" y1="32" x2="39.5" y2="32" stroke={coreFill} strokeWidth="1.6" />
      {/* Precision S-curve forward motion */}
      <path
        d="M48 20C43.5 17.5 36.5 19.5 36.5 25C36.5 31.5 51 30.5 51 38.5C51 44.5 44 47.5 37 45.5"
        stroke={sFill}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Intelligence Blue directional orbit arc */}
      <path
        d="M10 43C18 52 43 44 55 15"
        stroke={orbitStroke}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="55" cy="15" r="2.8" fill={orbitStroke} />
    </svg>
  );
}

export function OppSiftLogo({
  variant = 'primary-horizontal',
  size = 'md',
  useUploadedEmblem = true,
  className = '',
}: OppSiftLogoProps) {
  const [imgError, setImgError] = useState(false);

  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const iconPx = iconSizes[size];
  const isDarkSurface = variant === 'dark-bg' || variant === 'compact';
  const isMono = variant === 'monochrome';

  const renderEmblem = () => {
    if (variant === 'monochrome') {
      return <OppSiftVectorSymbol mode="monochrome" size={iconPx} />;
    }
    if (useUploadedEmblem && !imgError && variant !== 'symbol') {
      return (
        <img
          src={ATTACHED_LOGO_URL}
          alt="OppSift emblem"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          style={{ width: iconPx, height: iconPx }}
          className={`object-cover shrink-0 ${
            isDarkSurface
              ? 'rounded-full ring-1 ring-white/25 shadow-md'
              : 'rounded-xl border border-[#E2E8F0] dark:border-white/15 shadow-xs'
          }`}
        />
      );
    }
    if (variant === 'app-icon') {
      return !imgError ? (
        <img
          src={ATTACHED_LOGO_URL}
          alt="OppSift app icon"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          style={{ width: iconPx, height: iconPx }}
          className="rounded-xl object-cover shrink-0 border border-white/20 shadow-sm"
        />
      ) : (
        <div
          style={{ width: iconPx, height: iconPx }}
          className="rounded-xl oppsift-sidebar-gradient flex items-center justify-center text-white border border-white/20 shrink-0"
        >
          <OppSiftVectorSymbol mode="on-dark" size={Math.round(iconPx * 0.72)} />
        </div>
      );
    }
    return <OppSiftVectorSymbol mode={isDarkSurface ? 'on-dark' : 'color'} size={iconPx} />;
  };

  if (variant === 'symbol' || variant === 'app-icon') {
    return <div className={`inline-flex items-center shrink-0 ${className}`}>{renderEmblem()}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 whitespace-nowrap ${className}`}>
      {renderEmblem()}
      <span
        className={`font-display font-bold tracking-tight ${textSizes[size]} ${
          isMono
            ? 'text-current'
            : isDarkSurface
            ? 'text-white'
            : 'text-[#172033] dark:text-[#F8FAFC]'
        }`}
      >
        <span>Opp</span>
        <span className={isMono ? '' : isDarkSurface ? 'text-[#FFD1DF]' : 'text-[#541B32] dark:text-[#E8A4B5]'}>
          Sift
        </span>
      </span>
    </div>
  );
}
