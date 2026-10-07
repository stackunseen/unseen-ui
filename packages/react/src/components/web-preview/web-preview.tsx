'use client';
import { useEffect, useState } from 'react';
import { ExternalLinkIcon, ReloadIcon } from '@radix-ui/react-icons';
import { safeHttpUrl } from '../../shared/disclosure.js';
import s from '../../shared/styles/devtools.module.css';

export interface WebPreviewProps {
  /** The host-supplied page to preview. Only http(s) URLs load. */
  url: string;
  title?: string;
  /** Called when the person submits a new address. The host decides whether to load it. */
  onNavigate?: (url: string) => void;
  className?: string;
}

/**
 * A sandboxed preview of a host page. The frame never receives same-origin access,
 * so generated pages cannot read the surrounding application.
 */
export function WebPreview({
  url,
  title = 'Web preview',
  onNavigate,
  className = '',
}: WebPreviewProps) {
  const [draft, setDraft] = useState(url);
  const [reloads, setReloads] = useState(0);
  useEffect(() => setDraft(url), [url]);
  const safe = safeHttpUrl(url);
  return (
    <section className={`${s.root} ${className}`} data-part="web-preview" aria-label={title}>
      <form
        className={s.header}
        onSubmit={(event) => {
          event.preventDefault();
          if (onNavigate && safeHttpUrl(draft)) onNavigate(draft);
        }}
      >
        <button
          type="button"
          className={s.iconButton}
          aria-label="Reload preview"
          disabled={!safe}
          onClick={() => setReloads((count) => count + 1)}
        >
          <ReloadIcon aria-hidden="true" />
        </button>
        <input
          className={s.address}
          aria-label="Preview address"
          value={draft}
          readOnly={!onNavigate}
          onChange={(event) => setDraft(event.target.value)}
        />
        {safe && (
          <a
            className={s.iconButton}
            href={safe}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open in a new tab"
          >
            <ExternalLinkIcon aria-hidden="true" />
          </a>
        )}
      </form>
      {safe ? (
        <iframe
          key={reloads}
          className={s.frameView}
          src={safe}
          title={title}
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <p className={s.notice}>This address cannot be previewed. Use an http or https URL.</p>
      )}
    </section>
  );
}
