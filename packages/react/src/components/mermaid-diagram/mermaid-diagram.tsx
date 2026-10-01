'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Accordion } from '../accordion/accordion.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/rich-markdown.module.css';
import { useRendererTheme } from '../../providers/theme/theme-provider.js';
import { defaultTheme } from '../../theme.js';
import type { ThemeTokens } from '../../theme.js';

export interface MermaidDiagramProps extends VariantProps<'MermaidDiagram'> {
  code: string;
  title?: string;
  description?: string;
  state?: 'complete' | 'streaming';
}
let renderQueue: Promise<unknown> = Promise.resolve();
/** Render jobs are serialized because Mermaid uses shared configuration. */
async function drawDiagram(
  code: string,
  id: string,
  palette: ThemeTokens,
  isCurrent: () => boolean,
) {
  const job = renderQueue.then(async () => {
    if (!isCurrent()) return;
    const { default: mermaid } = await import('mermaid');
    if (!isCurrent()) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      look: 'classic',
      theme: 'base',
      themeVariables: {
        primaryColor: palette['primary-soft'],
        primaryTextColor: palette.text,
        primaryBorderColor: palette.primary,
        lineColor: palette.muted,
        secondaryColor: palette['secondary-soft'],
        tertiaryColor: palette['surface-subtle'],
        background: palette.surface,
        mainBkg: palette.surface,
        textColor: palette.text,
        fontFamily: 'system-ui, sans-serif',
      },
      maxTextSize: 12000,
      maxEdges: 150,
      suppressErrorRendering: true,
      // Mermaid math uses generated HTML/MathML labels. Source HTML remains
      // rejected below and strict mode plus final sanitization stay enabled.
      flowchart: { htmlLabels: true },
      htmlLabels: true,
      secure: [
        'securityLevel',
        'startOnLoad',
        'maxTextSize',
        'maxEdges',
        'htmlLabels',
        'flowchart',
      ],
    });
    const scratch = document.createElement('div');
    scratch.style.cssText = 'position:fixed;left:-100000px;top:0;width:1000px;visibility:hidden';
    document.body.append(scratch);
    try {
      const result = await mermaid.render(id, code, scratch);
      const clean = DOMPurify.sanitize(result.svg, {
        USE_PROFILES: { svg: true, svgFilters: true, mathMl: true, html: true },
        ADD_TAGS: ['foreignObject'],
        // The only SVG-to-HTML boundary comes from Mermaid's generated labels.
        // DOMPurify still sanitizes their HTML and MathML descendants.
        HTML_INTEGRATION_POINTS: { foreignobject: true },
        FORBID_TAGS: [
          'script',
          'image',
          'a',
          'img',
          'iframe',
          'object',
          'embed',
          'video',
          'audio',
          'input',
          'button',
          'form',
          'link',
        ],
        FORBID_ATTR: ['href', 'xlink:href'],
      });
      const viewBox = clean.match(/<svg\b[^>]*\bviewBox=["']([^"']+)["']/i)?.[1];
      const intrinsicWidth = Number(viewBox?.trim().split(/[\s,]+/)[2]);
      return {
        svg: clean,
        // Preserve legible diagram text on small screens using local scrolling.
        // A hostile/invalid dimension must not create an unbounded layout box.
        width: Number.isFinite(intrinsicWidth)
          ? Math.min(8000, Math.max(320, intrinsicWidth))
          : 520,
      };
    } finally {
      scratch.remove();
      document.getElementById(`d${id}`)?.remove();
    }
  });
  renderQueue = job.catch(() => undefined);
  return job;
}
export function MermaidDiagram({
  code,
  title = 'Diagram',
  description,
  state = 'complete',
  variant = 'panel',
}: MermaidDiagramProps) {
  const host = useRef<HTMLDivElement>(null);
  const themeContext = useRendererTheme();
  const [darkSystem, setDarkSystem] = useState(false);
  const [visible, setVisible] = useState(false);
  const mode = themeContext?.appearance ?? 'system';
  const palette = (themeContext?.theme ?? defaultTheme)[
    mode === 'dark' || (mode === 'system' && darkSystem) ? 'dark' : 'light'
  ];
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDarkSystem(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!host.current) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const generation = useRef(0);
  const renderKey = useMemo(() => JSON.stringify([code, palette]), [code, palette]);
  const [result, setResult] = useState<{
    key: string;
    svg?: string;
    width?: number;
    error?: string;
  }>();
  const [zoom, setZoom] = useState(100);
  const [copy, setCopy] = useState<{ code: string; message: string }>();
  const copyAttempt = useRef(0);
  // Reject configuration/interaction directives so generated text cannot widen renderer policy.
  const restricted =
    code.length > 12000 ||
    /^\s*---/m.test(code) ||
    // Extended metadata is YAML; escaped keys can conceal an image URL before
    // Mermaid creates an Image during layout. Keep that entire feature inert.
    /@\s*\{/.test(code) ||
    /(?:^|[;\r\n])\s*(?:click|classDef|linkStyle|style)\b/i.test(code) ||
    /%%\{|\b(?:img|image)["']?\s*:|<\/?[a-z]|url\s*\(|@import|data:|javascript:|https?:\/\//i.test(
      code,
    );
  useEffect(() => {
    const token = ++generation.current;
    let cancelled = false;
    if (!visible || state === 'streaming' || restricted || !code.trim()) return;
    void drawDiagram(code, `ai-diagram-${id}-${token}`, palette, () => !cancelled).then(
      (diagram) => {
        if (!cancelled && diagram) setResult({ key: renderKey, ...diagram });
      },
      () => {
        if (!cancelled)
          setResult({
            key: renderKey,
            error: 'Unable to render this diagram. Review the source syntax.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code, id, state, restricted, visible, palette, renderKey]);
  const current = result?.key === renderKey ? result : undefined;
  async function copySource() {
    const attempt = ++copyAttempt.current;
    try {
      await navigator.clipboard.writeText(code);
      if (attempt === copyAttempt.current) setCopy({ code, message: 'Diagram source copied.' });
    } catch {
      if (attempt === copyAttempt.current)
        setCopy({ code, message: 'Copy unavailable. Select the source to copy.' });
    }
  }
  const error = restricted
    ? 'This diagram exceeds the preview limits or uses unsupported configuration, node metadata, links or interaction directives.'
    : current?.error;
  const source = (
    <pre className={s.source} tabIndex={0} role="group" aria-label="Mermaid source">
      {code.slice(0, 12000)}
    </pre>
  );
  return (
    <div ref={host} className={s.diagram} data-part="mermaid-diagram" data-variant={variant}>
      <div className={s.header}>
        <strong>{title}</strong>
        <IconButton
          icon="copy"
          label="Copy source"
          disabled={!code || code.length > 12000 || state === 'streaming'}
          onClick={() => void copySource()}
        />
      </div>
      {description && <p className={s.muted}>{description}</p>}
      {state === 'streaming' ? (
        <p role="status" className={s.muted}>
          Receiving diagram source…
        </p>
      ) : error ? (
        <p role="status" className={s.error}>
          {error}
        </p>
      ) : !code.trim() ? (
        <p className={s.muted}>No diagram source.</p>
      ) : !current?.svg ? (
        <LoadingIndicator label="Rendering diagram" />
      ) : (
        <>
          <div className={s.zoomRail} role="group" aria-label="Diagram zoom">
            <Button
              size="sm"
              variant="ghost"
              disabled={zoom <= 50}
              aria-label="Zoom out diagram"
              onClick={() => setZoom((value) => value - 25)}
            >
              −
            </Button>
            <span className={`${s.muted} ${s.zoomValue}`}>{zoom}%</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={zoom >= 200}
              aria-label="Zoom in diagram"
              onClick={() => setZoom((value) => value + 25)}
            >
              +
            </Button>
            <Button className={s.zoomReset} size="sm" variant="ghost" onClick={() => setZoom(100)}>
              Reset zoom
            </Button>
          </div>
          <div
            data-part="diagram-canvas"
            className={s.canvas}
            role="group"
            aria-label={title}
            tabIndex={0}
          >
            <div
              style={{ width: `${zoom}%`, minWidth: `${((current.width ?? 520) * zoom) / 100}px` }}
              dangerouslySetInnerHTML={{ __html: current.svg }}
            />
          </div>
        </>
      )}
      {variant === 'source' || error || state === 'streaming' ? (
        source
      ) : (
        <Accordion
          type="single"
          collapsible
          items={[{ value: 'source', title: 'Diagram source', content: source }]}
        />
      )}
      {copy?.code === code && (
        <p role="status" className={s.muted}>
          {copy.message}
        </p>
      )}
    </div>
  );
}
