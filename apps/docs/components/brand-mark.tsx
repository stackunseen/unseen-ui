import type { SVGProps } from 'react';

/**
 * The Unseen UI mark: a 2×2 module grid whose rounded corners hide a "U" in the negative space.
 * Dark cells follow the text colour, the quiet cell is a tint of it and the circle takes the
 * primary colour, so the mark follows the active theme and appearance.
 */
export function BrandMark({ size = 28, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M22 0h16q6 0 6 6v32q0 6-6 6H6q-6 0-6-6V22A22 22 0 0 1 22 0Z" fill="currentColor" />
      <circle cx="78" cy="22" r="22" fill="var(--ai-primary, #2563eb)" />
      <path
        d="M6 56h32q6 0 6 6v32q0 6-6 6H22A22 22 0 0 1 0 78V62q0-6 6-6Z"
        fill="color-mix(in srgb, currentColor 22%, transparent)"
      />
      <path
        d="M62 56h16a22 22 0 0 1 22 22v16q0 6-6 6H62q-6 0-6-6V62q0-6 6-6Z"
        fill="currentColor"
      />
    </svg>
  );
}
