'use client';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import d from '../../shared/styles/display.module.css';

export interface AvatarProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Supplies the accessible name. Without it the avatar is decorative. */
  name?: string;
  /** Overrides the initials derived from the name. */
  initials?: string;
  src?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]!;
  const last = words.length > 1 ? words[words.length - 1]! : '';
  return `${[...first][0] ?? ''}${last ? ([...last][0] ?? '') : ([...first][1] ?? '')}`
    .toLocaleUpperCase()
    .slice(0, 2);
}

/** Shows an image when it loads, otherwise initials, otherwise a generic person icon. */
export function Avatar({
  name,
  initials,
  src,
  size = 'default',
  className = '',
  ...props
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const fallback = initials ?? (name ? avatarInitials(name) : '');
  const showImage = Boolean(src) && !failed;
  return (
    <span
      {...props}
      role={name ? 'img' : undefined}
      aria-label={name}
      aria-hidden={name ? undefined : true}
      data-size={size}
      data-part="avatar"
      className={`${d.avatar} ${className}`}
    >
      {showImage ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : fallback ? (
        fallback
      ) : (
        <AIIcon name="user" size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} />
      )}
    </span>
  );
}
