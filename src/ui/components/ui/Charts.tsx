import React, { useState } from 'react';

export interface TrendPoint {
  label: string;
  total: number;
  matched: number;
  tracked?: number;
}

export function KpiSparkline({
  values,
  tone = 'burgundy',
  idSuffix = '1',
}: {
  values: number[];
  tone?: 'burgundy' | 'blue';
  idSuffix?: string;
}) {
  const w = 260;
  const h = 44;
  const padX = 2;
  const padY = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const pts = values.map((v, i) => {
    const x = padX + (i / Math.max(values.length - 1, 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const linePath = pts.reduce((acc, p, idx, arr) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[idx - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  const strokeColor = tone === 'blue' ? '#0EA5E9' : '#EC4899';
  const gradId = `oppsift-spark-${tone}-${idSuffix}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-11 overflow-hidden pointer-events-none block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.34" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DiscoveryTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const width = 560;
  const height = 224;
  const padL = 46;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const hasTracked = data.some((d) => typeof d.tracked === 'number');
  const maxVal = Math.max(...data.map((d) => d.total), 100);
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  const getX = (idx: number) => padL + (idx / Math.max(data.length - 1, 1)) * innerW;
  const getY = (val: number) => padT + innerH - (val / maxVal) * innerH;

  const totalLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`).join(' ');
  const totalArea = `${totalLine} L ${getX(data.length - 1)} ${padT + innerH} L ${getX(0)} ${padT + innerH} Z`;
  const matchedLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.matched)}`).join(' ');
  const matchedArea = `${matchedLine} L ${getX(data.length - 1)} ${padT + innerH} L ${getX(0)} ${padT + innerH} Z`;
  const trackedLine = hasTracked
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.tracked ?? 0)}`).join(' ')
    : '';
  const trackedArea = hasTracked
    ? `${trackedLine} L ${getX(data.length - 1)} ${padT + innerH} L ${getX(0)} ${padT + innerH} Z`
    : '';

  const formatTick = (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}K` : `${val}`);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-[#64748B] dark:text-[#CBD5E1]">
        {hoveredIdx !== null ? (
          <span className="font-mono tabular-nums text-[11px] text-[#172033] dark:text-[#F8FAFC]">
            {data[hoveredIdx].label}: {data[hoveredIdx].total.toLocaleString()} total ·{' '}
            {data[hoveredIdx].matched.toLocaleString()} matched
            {hasTracked ? ` · ${(data[hoveredIdx].tracked ?? 0).toLocaleString()} tracked` : ''}
          </span>
        ) : (
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Hover nodes to inspect notice volume
          </span>
        )}
        <div className="flex flex-wrap items-center gap-4 ml-auto">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899] inline-block" />
            <span>Total</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block" />
            <span>Matched</span>
          </span>
          {hasTracked && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] inline-block" />
              <span>Tracked</span>
            </span>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto aspect-[560/224] min-h-[156px] max-h-60 block"
          role="img"
          aria-label="Opportunity discovery overview chart"
        >
        <defs>
          <linearGradient id="oppsiftTotalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="oppsiftTrackedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="oppsiftMatchedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                className="stroke-[#E2E8F0] dark:stroke-white/10"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#64748B] dark:fill-[#CBD5E1] text-[10px] font-mono tabular-nums"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Vertical column gridlines */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <line
              key={`v-${d.label}`}
              x1={x}
              y1={padT}
              x2={x}
              y2={padT + innerH}
              className="stroke-[#E2E8F0]/70 dark:stroke-white/8"
              strokeWidth="1"
            />
          );
        })}

        <path d={totalArea} fill="url(#oppsiftTotalGrad)" />
        {hasTracked && <path d={trackedArea} fill="url(#oppsiftTrackedGrad)" />}
        <path d={matchedArea} fill="url(#oppsiftMatchedGrad)" />

        <path
          d={totalLine}
          fill="none"
          stroke="#EC4899"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hasTracked && (
          <path
            d={trackedLine}
            fill="none"
            stroke="#A855F7"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <path
          d={matchedLine}
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = getX(i);
          const yTotal = getY(d.total);
          const yMatched = getY(d.matched);
          const yTracked = getY(d.tracked ?? 0);
          const active = hoveredIdx === i;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect x={x - 26} y={padT} width={52} height={innerH + 24} fill="transparent" />
              {active && (
                <line
                  x1={x}
                  y1={padT}
                  x2={x}
                  y2={padT + innerH}
                  className="stroke-[#EC4899]/60"
                  strokeWidth="1.2"
                />
              )}
              <circle
                cx={x}
                cy={yTotal}
                r={active ? 5.2 : 4}
                fill="#FFFFFF"
                stroke="#EC4899"
                strokeWidth="2.4"
              />
              {hasTracked && (
                <circle
                  cx={x}
                  cy={yTracked}
                  r={active ? 4.8 : 3.8}
                  fill="#FFFFFF"
                  stroke="#A855F7"
                  strokeWidth="2.2"
                />
              )}
              <circle
                cx={x}
                cy={yMatched}
                r={active ? 5.2 : 4}
                fill="#FFFFFF"
                stroke="#38BDF8"
                strokeWidth="2.4"
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-[#64748B] dark:fill-[#CBD5E1] text-[11px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
        </svg>
      </div>
    </div>
  );
}

export interface HorizontalBarItem {
  label: string;
  value: number;
  sublabel?: string;
  accent?: 'burgundy' | 'blue';
}

export function HorizontalBarChart({ items, maxOverride }: { items: HorizontalBarItem[]; maxOverride?: number }) {
  const max = maxOverride ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#172033] dark:text-[#F8FAFC] truncate pr-2">{item.label}</span>
              <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1] shrink-0">
                {item.value.toLocaleString()}
                {item.sublabel ? ` · ${item.sublabel}` : ''}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F1F5F9] dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.accent === 'blue'
                    ? 'bg-[#164E8B] dark:bg-[#38BDF8]'
                    : 'bg-[#541B32] dark:bg-[#D94673]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategorySplitRing({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" role="img" aria-label="Opportunities by category">
          {segments.map((seg) => {
            const dash = (seg.value / total) * circumference;
            const offset = -cumulative;
            cumulative += dash;
            return (
              <circle
                key={seg.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-display font-bold tabular-nums text-[#172033] dark:text-[#F8FAFC]">
            {total.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">Notices</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-[#172033] dark:text-[#F8FAFC] truncate">{seg.label}</span>
              </div>
              <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1] shrink-0">
                {seg.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
