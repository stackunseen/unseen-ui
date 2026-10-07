'use client';
import { useState } from 'react';
import s from '../../shared/styles/media.module.css';

export interface ImageProps {
  /** Host-supplied image URL (http(s), blob:) or a base64 payload with mediaType. */
  src?: string;
  base64?: string;
  mediaType?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  /** Required description; use "" only for purely decorative images. */
  alt: string;
  caption?: string;
  /** "loading" while the host is generating or fetching the image. */
  state?: 'loading' | 'ready';
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

/** A generated or attached image with loading and failure states. SVG data is not accepted. */
export function Image({
  src,
  base64,
  mediaType,
  alt,
  caption,
  state = 'ready',
  width,
  height,
  className = '',
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolve({ src, base64, mediaType });
  return (
    <figure
      className={`${s.root} ${s.figure} ${className}`}
      data-part="image"
      aria-busy={state === 'loading' || undefined}
    >
      {state === 'loading' ? (
        <div
          className={s.placeholder}
          role="status"
          style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined }}
        >
          Generating image…
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
