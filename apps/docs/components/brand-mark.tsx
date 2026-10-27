import type { SVGProps } from 'react';

/**
 * The Unseen UI mark: a 2×2 module grid whose rounded corners hide a "U" in the negative space.
 * Dark cells follow the text colour, the quiet cell is a tint of it and the circle takes the
 * primary colour, so the mark follows the active theme and appearance.
 */
export function BrandMark({ size = 28, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* A 24-unit grid: at 24px every straight edge lands on a whole pixel. */}
      <path d="M6 0h3q2 0 2 2v7q0 2-2 2H2q-2 0-2-2V6A6 6 0 0 1 6 0Z" fill="currentColor" />
      <circle cx="18.5" cy="5.5" r="5.5" fill="var(--ai-primary, #2563eb)" />
      <path
        d="M2 13h7q2 0 2 2v7q0 2-2 2H6A6 6 0 0 1 0 18v-3q0-2 2-2Z"
        fill="color-mix(in srgb, currentColor 22%, transparent)"
      />
      <path d="M15 13h3a6 6 0 0 1 6 6v3q0 2-2 2H15q-2 0-2-2v-7q0-2 2-2Z" fill="currentColor" />
    </svg>
  );
}
