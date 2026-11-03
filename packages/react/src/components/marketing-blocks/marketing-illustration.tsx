'use client';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type MarketingIllustrationName = 'agents' | 'integrations' | 'approval' | 'empty';
export interface MarketingIllustrationProps extends Omit<
  ComponentPropsWithoutRef<'svg'>,
  'children'
> {
  /** The scene: an agent team, integrations around a hub, an approval in flight, or an empty state. */
  variant?: MarketingIllustrationName;
  /** Read to assistive technology; omit for a purely decorative scene. */
  title?: string;
}

const scenes: Record<MarketingIllustrationName, { viewBox: string; render: () => ReactNode }> = {
  agents: {
    viewBox: '0 0 320 200',
    render: () => (
      <>
        <rect className="uim-ill-line" x="112" y="24" width="96" height="40" rx="10" />
        <circle className="uim-ill-dot" cx="132" cy="44" r="6" />
        <rect className="uim-ill-text" x="146" y="38" width="48" height="5" rx="2.5" />
        <rect className="uim-ill-text" x="146" y="48" width="30" height="4" rx="2" />
        {[20, 116, 212].map((x, index) => (
          <g key={x} className="uim-ill-float" style={{ animationDelay: `${index * 400}ms` }}>
            <path className="uim-ill-edge" d={`M160 64 C160 96 ${x + 44} 96 ${x + 44} 128`} />
            <rect className="uim-ill-line" x={x} y="128" width="88" height="40" rx="10" />
            <circle className="uim-ill-dot" cx={x + 20} cy="148" r="6" />
            <rect className="uim-ill-text" x={x + 34} y="142" width="44" height="5" rx="2.5" />
            <rect className="uim-ill-text" x={x + 34} y="152" width="26" height="4" rx="2" />
          </g>
        ))}
      </>
    ),
  },
  integrations: {
    viewBox: '0 0 320 200',
    render: () => (
      <>
        <circle className="uim-ill-ring" cx="160" cy="100" r="68" />
        <circle
          className="uim-ill-ring uim-ill-spin"
          cx="160"
          cy="100"
          r="44"
          strokeDasharray="6 10"
        />
        <rect className="uim-ill-fill" x="140" y="80" width="40" height="40" rx="12" />
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 160 + Math.cos(rad) * 68;
          const cy = 100 + Math.sin(rad) * 68;
          return (
            <g key={angle}>
              <line className="uim-ill-edge" x1="160" y1="100" x2={cx} y2={cy} />
              <rect
                className="uim-ill-line"
                x={cx - 12}
                y={cy - 12}
                width="24"
                height="24"
                rx="7"
              />
            </g>
          );
        })}
      </>
    ),
  },
  approval: {
    viewBox: '0 0 320 200',
    render: () => (
      <>
        <rect className="uim-ill-line" x="52" y="36" width="216" height="128" rx="14" />
        <rect className="uim-ill-text" x="72" y="56" width="120" height="7" rx="3.5" />
        <rect className="uim-ill-text" x="72" y="72" width="176" height="5" rx="2.5" />
        <rect className="uim-ill-text" x="72" y="84" width="150" height="5" rx="2.5" />
        <rect className="uim-ill-soft" x="72" y="102" width="176" height="18" rx="6" />
        <rect className="uim-ill-line" x="150" y="130" width="46" height="18" rx="9" />
        <rect
          className="uim-ill-fill uim-ill-pulse"
          x="202"
          y="130"
          width="46"
          height="18"
          rx="9"
        />
        <path className="uim-ill-check" d="M218 139.5 L223 144 L232 134" />
      </>
    ),
  },
  empty: {
    viewBox: '0 0 320 200',
    render: () => (
      <>
        <rect
          className="uim-ill-line"
          x="96"
          y="44"
          width="128"
          height="112"
          rx="14"
          strokeDasharray="8 8"
        />
        <circle className="uim-ill-soft" cx="160" cy="92" r="22" />
        <path className="uim-ill-edge" d="M150 92 h20 M160 82 v20" />
        <rect className="uim-ill-text" x="124" y="126" width="72" height="5" rx="2.5" />
        <rect className="uim-ill-text" x="136" y="138" width="48" height="4" rx="2" />
      </>
    ),
  },
};

/**
 * Four small line illustrations for marketing pages, drawn in the theme's own colours so they
 * match every palette and both appearances. Motion is slight and stops under reduced motion.
 */
export function MarketingIllustration({
  variant = 'agents',
  title,
  className = '',
  ...props
}: MarketingIllustrationProps) {
  const scene = scenes[variant];
  return (
    <svg
      {...props}
      className={`uim-illustration ${className}`}
      data-part="marketing-illustration"
      data-variant={variant}
      viewBox={scene.viewBox}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {scene.render()}
    </svg>
  );
}
