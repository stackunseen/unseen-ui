'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Sidebar links that mark the current page, like the component sidebar. */
export function FrameLinks({ links }: { links: readonly (readonly [string, string])[] }) {
  const pathname = usePathname();
  return links.map(([text, href]) => (
    <Link
      key={href}
      href={href}
      aria-current={!href.includes('#') && pathname === href ? 'page' : undefined}
    >
      {text}
    </Link>
  ));
}
