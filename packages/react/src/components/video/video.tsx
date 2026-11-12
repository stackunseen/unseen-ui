'use client';
import { type ComponentProps, useState } from 'react';
import { Button } from '../button/button.js';
import { Progress } from '../progress/progress.js';
import s from '../../shared/styles/media.module.css';

export interface VideoProps extends ComponentProps<'figure'> {
  /** Host-supplied video URL: http(s) or blob:. Other schemes are refused. */
  src?: string;
  /** A still frame (http(s), blob: or a PNG/JPEG/WebP data URL) shown before playback. */
  poster?: string;
  /** Required: what the video shows, for people who cannot watch it. */
  label: string;
  caption?: string;
  /**
   * "queued" before generation starts, "loading" while the host generates or fetches it,
   * "failed" when it could not; "ready" shows a player.
   */
  state?: 'queued' | 'loading' | 'ready' | 'failed';
  /** Host-measured progress from 0 to 1 while loading. Leave it out when unknown. */
  progress?: number;
  /** A frame of the video so far, shown softened while loading. */
  preview?: string;
  /** What went wrong, shown with state "failed". */
  error?: string;
  /** Offers a retry with state "failed". */
  onRetry?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

function safeVideo(src?: string) {
  if (!src) return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'blob'].includes(scheme) ? src : undefined;
}

function safeStill(src?: string) {
  if (!src) return undefined;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) return src;
  return safeVideo(src);
}

/**
 * A generated video with queued, progress, partial-frame, failed and ready states. It never
 * autoplays; the player has native controls, and the label describes it for screen readers.
 */
export function Video({
  src,
  poster,
  label,
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
}: VideoProps) {
  const [failed, setFailed] = useState(false);
  const resolved = safeVideo(src);
  const still = safeStill(poster);
  const partial = state === 'loading' ? safeStill(preview) : undefined;
  const measured =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(Math.max(progress, 0), 1)
      : undefined;
  const ratio = width && height ? `${width} / ${height}` : '16 / 9';
  const pending = state === 'loading' || state === 'queued';
  return (
    <figure
      {...rest}
      className={`${s.root} ${s.figure} ${className}`}
      data-part="video"
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
                ? 'Generating video…'
                : `Generating video… ${Math.round(measured * 100)}%`}
            {state === 'loading' && measured !== undefined && (
              <Progress label="Video generation" value={measured} max={1} />
            )}
          </div>
        </div>
      ) : state === 'failed' ? (
        <div className={s.placeholder} role="alert" style={{ aspectRatio: ratio }}>
          <div className={s.pendingStatus}>
            {error?.slice(0, 300) || 'The video could not be created.'}
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </div>
      ) : !resolved || failed ? (
        <div
          className={s.placeholder}
          role="img"
          aria-label={label || 'Video unavailable'}
          style={{ aspectRatio: ratio }}
        >
          Video unavailable
        </div>
      ) : (
        <video
          className={s.image}
          src={resolved}
          poster={still}
          aria-label={label}
          width={width}
          height={height}
          // Fixed, so a poster of another shape does not resize the player before it plays.
          style={{ aspectRatio: ratio }}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
