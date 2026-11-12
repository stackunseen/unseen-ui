'use client';
import { type ComponentProps, useState } from 'react';
import { Button } from '../button/button.js';
import { Progress } from '../progress/progress.js';
import s from '../../shared/styles/media.module.css';

export interface ImageProps extends ComponentProps<'figure'> {
  /** Host-supplied image URL (http(s), blob:) or a base64 payload with mediaType. */
  src?: string;
  base64?: string;
  mediaType?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  /** Required description; use "" only for purely decorative images. */
  alt: string;
  caption?: string;
  /**
   * "queued" before generation starts, "loading" while the host generates or fetches it,
   * "failed" when it could not; "ready" shows the image.
   */
  state?: 'queued' | 'loading' | 'ready' | 'failed';
  /** Host-measured progress from 0 to 1 while loading. Leave it out when unknown. */
  progress?: number;
  /** A partial image the model has streamed so far (URL), shown softened while loading. */
  preview?: string;
  /** What went wrong, shown with state "failed". */
  error?: string;
  /** Offers a retry with state "failed". */
  onRetry?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

function resolve({ src, base64, mediaType }: Pick<ImageProps, 'src' | 'base64' | 'mediaType'>) {
  if (base64 && mediaType && /^[A-Za-z0-9+/=\s]+$/.test(base64))
    return `data:${mediaType};base64,${base64.replace(/\s/g, '')}`;
  if (!src) return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'blob'].includes(scheme) ? src : undefined;
}

/** A generated or attached image with queued, progress, partial, failed and ready states. SVG data is not accepted. */
export function Image({
  src,
  base64,
  mediaType,
  alt,
  caption,
  state = 'ready',
  progress,
  preview,
  error,
  onRetry,
  width,
  height,
  className = '',
  ...rest
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolve({ src, base64, mediaType });
  const partial = state === 'loading' ? resolve({ src: preview }) : undefined;
  const measured =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(Math.max(progress, 0), 1)
      : undefined;
  const ratio = width && height ? `${width} / ${height}` : undefined;
  const pending = state === 'loading' || state === 'queued';
  return (
    <figure
      {...rest}
      className={`${s.root} ${s.figure} ${className}`}
      data-part="image"
      data-state={state}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <div className={s.placeholder} style={{ aspectRatio: ratio }}>
          {partial && <img className={s.partial} src={partial} alt="" aria-hidden="true" />}
          <div className={s.pendingStatus} role="status">
            {state === 'queued'
              ? 'Waiting to start…'
              : measured === undefined
                ? 'Generating image…'
                : `Generating image… ${Math.round(measured * 100)}%`}
            {state === 'loading' && measured !== undefined && (
              <Progress label="Image generation" value={measured} max={1} />
            )}
          </div>
        </div>
      ) : state === 'failed' ? (
        <div className={s.placeholder} role="alert" style={{ aspectRatio: ratio }}>
          <div className={s.pendingStatus}>
            {error?.slice(0, 300) || 'The image could not be created.'}
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </div>
      ) : !resolved || failed ? (
        <div className={s.placeholder} role="img" aria-label={alt || 'Image unavailable'}>
          Image unavailable
        </div>
      ) : (
        <img
          className={s.image}
          src={resolved}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
