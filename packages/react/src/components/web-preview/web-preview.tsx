'use client';
import { useEffect, useId, useState } from 'react';
import { ExternalLinkIcon, ReloadIcon } from '@radix-ui/react-icons';
import { safeHttpUrl } from '../../shared/disclosure.js';
import s from '../../shared/styles/devtools.module.css';

export interface WebPreviewProps {
  /** The host-supplied page to preview. Only http(s) URLs load. */
  url: string;
  title?: string;
  /** Called when the person submits a new address. The host decides whether to load it. */
  onNavigate?: (url: string) => void;
  /**
   * `failed` and `unavailable` come from the host: a page inside a sandboxed frame cannot report
   * that it did not load. While `ready`, the preview shows a loading line until the frame loads.
   */
  status?: 'ready' | 'failed' | 'unavailable';
  /** A short host reason shown with `failed` or `unavailable`. */
  error?: string;
  /** Called on Reload and Try again, so the host can check the page and update `status`. */
  onReload?: () => void;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<WebPreviewLabels>;
  className?: string;
}
export interface WebPreviewLabels {
  reload: string;
  address: string;
  openInNewTab: string;
  /** Shown when a typed address is not a full http(s) URL. */
  invalidAddress: string;
  /** Shown in place of the frame when the host's `url` cannot be previewed. */
  blocked: string;
  loading: string;
  failed: string;
  unavailable: string;
  retry: string;
}
const defaultLabels: WebPreviewLabels = {
  reload: 'Reload preview',
  address: 'Preview address',
  openInNewTab: 'Open in a new tab',
  invalidAddress: 'Enter a full address that starts with http:// or https://.',
  blocked: 'This address cannot be previewed. Use an http or https URL.',
  loading: 'Loading preview…',
  failed: 'This page did not load.',
  unavailable: 'This preview is not available right now.',
  retry: 'Try again',
};

/**
 * A sandboxed preview of a host page. The frame never receives same-origin access,
 * so generated pages cannot read the surrounding application.
 */
export function WebPreview({
  url,
  title = 'Web preview',
  onNavigate,
  status = 'ready',
  error,
  onReload,
  labels,
  className = '',
}: WebPreviewProps) {
  const text = { ...defaultLabels, ...labels };
  const [draft, setDraft] = useState(url);
  const [reloads, setReloads] = useState(0);
  const [rejected, setRejected] = useState(false);
  // The frame that finished loading, as "address, reload count"; any other frame is still loading.
  const [loadedFrame, setLoadedFrame] = useState<string>();
  const errorId = useId();
  useEffect(() => {
    setDraft(url);
    setRejected(false);
  }, [url]);
  const safe = safeHttpUrl(url);
  const frame = `${safe}\n${reloads}`;
  const loading = !!safe && status === 'ready' && loadedFrame !== frame;
  const reload = () => {
    setReloads((count) => count + 1);
    onReload?.();
  };
  return (
    <section
      className={`${s.root} ${className}`}
      data-part="web-preview"
      data-status={safe ? status : 'blocked'}
      aria-label={title}
      aria-busy={loading || undefined}
    >
      <form
        className={s.header}
        onSubmit={(event) => {
          event.preventDefault();
          if (!onNavigate) return;
          const next = draft.trim();
          const allowed = !!safeHttpUrl(next);
          setRejected(!allowed);
          if (allowed) onNavigate(next);
        }}
      >
        <button
          type="button"
          className={s.iconButton}
          aria-label={text.reload}
          disabled={!safe}
          onClick={reload}
        >
          <ReloadIcon aria-hidden="true" />
        </button>
        <input
          className={s.address}
          aria-label={text.address}
          value={draft}
          readOnly={!onNavigate}
          aria-invalid={rejected || undefined}
          aria-describedby={rejected ? errorId : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setRejected(false);
          }}
        />
        {safe && (
          <a
            className={s.iconButton}
            href={safe}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={text.openInNewTab}
          >
            <ExternalLinkIcon aria-hidden="true" />
          </a>
        )}
      </form>
      {rejected && (
        <p id={errorId} role="alert" className={s.notice}>
          {text.invalidAddress}
        </p>
      )}
      {!safe ? (
        <p className={s.notice}>{text.blocked}</p>
      ) : status === 'ready' ? (
        <div className={s.frameWrap}>
          <iframe
            key={reloads}
            className={s.frameView}
            src={safe}
            title={title}
            sandbox="allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setLoadedFrame(frame)}
          />
          <p role="status" className={loading ? s.frameStatus : s.srOnly}>
            {loading ? text.loading : ''}
          </p>
        </div>
      ) : (
        <div className={s.notice} role="alert">
          <p className={s.noticeText}>
            {status === 'failed' ? text.failed : text.unavailable}
            {error ? ` ${error}` : ''}
          </p>
          {status === 'failed' && (
            <button type="button" className={s.iconButton} onClick={reload}>
              {text.retry}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
