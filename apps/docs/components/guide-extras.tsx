'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TableOfContents } from '@stackunseen/ui/navigation';
import '@stackunseen/ui/navigation.css';

type FrameLink = readonly [label: string, href: string];
const trim = (path: string) => path.replace(/\/+$/, '') || '/';

/** "On this page" for a guide, read from the sections it rendered. Wide screens only. */
export function GuideOutline() {
  const pathname = usePathname();
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    // Read once the guide is on screen; the list only changes when the page does.
    const frame = requestAnimationFrame(() => {
      const headings = document.querySelectorAll<HTMLHeadingElement>('#main-content h2[id]');
      setItems([...headings].map((h) => ({ id: h.id, title: h.textContent?.trim() ?? '' })));
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return (
    <div className="guide-outline">
      <TableOfContents
        variant="track"
        collapsible="never"
        headingLevel={2}
        minItems={3}
        items={items}
      />
    </div>
  );
}

/** The guide before and after this one, in the order of the documentation menu. */
export function GuidePager({ links }: { links: readonly FrameLink[] }) {
  const pathname = trim(usePathname());
  const index = links.findIndex(([, href]) => trim(href) === pathname);
  if (index < 0) return null;
  const previous = links[index - 1];
  const next = links[index + 1];
  if (!previous && !next) return null;
  return (
    <nav className="page-pager" aria-label="More guides">
      {previous && (
        <Link href={previous[1]} rel="prev">
          <span>
            <ArrowLeft size={16} aria-hidden="true" /> Previous
          </span>
          <strong>{previous[0]}</strong>
        </Link>
      )}
      {next && (
        <Link href={next[1]} rel="next" data-next="">
          <span>
            Next <ArrowRight size={16} aria-hidden="true" />
          </span>
          <strong>{next[0]}</strong>
        </Link>
      )}
    </nav>
  );
}
