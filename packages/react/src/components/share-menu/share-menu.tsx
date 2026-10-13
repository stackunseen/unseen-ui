'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../button/button.js';
import { LinkButton } from '../link-button/link-button.js';
import { CopyButton } from '../copy-button/copy-button.js';
import { DropdownMenu } from '../dropdown-menu/dropdown-menu.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { useCopy } from '../../shared/copy.js';
import s from './share-menu.module.css';

export interface ShareCustomTarget {
  id: string;
  label: string;
  /** A fully built URL; the host encodes its own parameters. */
  href: string;
  icon?: ReactNode;
}
export type ShareTarget = 'copy' | 'native' | 'linkedin' | 'x' | 'email' | ShareCustomTarget;

export interface ShareMenuProps extends Omit<ComponentProps<'div'>, 'title'> {
  url: string;
  title: string;
  /** Accompanies the link where a target takes text, such as email. */
  text?: string;
  targets?: readonly ShareTarget[];
  /** Inline buttons, or one Share button that opens a menu. */
  presentation?: 'inline' | 'menu';
  /** Names the group, or the menu button. */
  label?: string;
  /** Called with the target id after a share was requested; a dismissed native share still counts. */
  onShare?: (target: string) => void;
  copyLabel?: string;
  nativeLabel?: string;
}

const subscribeNever = () => () => {};
const canShareNow = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

function targetLink(target: ShareTarget, url: string, title: string, text?: string) {
  const link = encodeURIComponent(url);
  if (typeof target === 'object') return { id: target.id, label: target.label, href: target.href };
  if (target === 'linkedin')
    return {
      id: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
    };
  if (target === 'x')
    return {
      id: 'x',
      label: 'X',
      href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${link}`,
    };
  if (target === 'email')
    return {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text ? `${text}\n\n${url}` : url)}`,
      email: true,
    };
  return null;
}

/**
 * Shares the current page: copy the link, the device's own share sheet when there is one,
 * and configurable targets. No tracking parameters are added. Support for the native share
 * sheet is decided on the client only, so the server and first client render agree.
 */
export function ShareMenu({
  url,
  title,
  text,
  targets = ['copy', 'native', 'linkedin', 'x', 'email'],
  presentation = 'inline',
  label = presentation === 'menu' ? 'Share' : 'Share this page',
  onShare,
  copyLabel = 'Copy link',
  nativeLabel = 'Share…',
  className = '',
  ...props
}: ShareMenuProps) {
  const canShare = useSyncExternalStore(subscribeNever, canShareNow, () => false);
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = (message: string) => {
    clearTimeout(timer.current);
    setStatus(message);
    timer.current = setTimeout(() => setStatus(''), 2500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const { copy } = useCopy();
  const native = async () => {
    try {
      await navigator.share({ title, text, url });
      onShare?.('native');
    } catch (error) {
      // A dismissed sheet is not an error; anything else is reported honestly.
      if ((error as { name?: string } | null)?.name === 'AbortError') return;
      say('Sharing is unavailable here. Copy the link instead.');
    }
  };
  const links = targets
    .map((target) => targetLink(target, url, title, text))
    .filter((link): link is NonNullable<typeof link> => link !== null);
  const wantsCopy = targets.includes('copy');
  const wantsNative = targets.includes('native') && canShare;
  const external = (link: { email?: boolean }) =>
    link.email ? {} : { target: '_blank', rel: 'noopener noreferrer' };

  if (presentation === 'menu')
    return (
      <div {...props} className={`${s.root} ${className}`} data-part="share-menu">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline">
              <AIIcon name="external" />
              {label}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {wantsCopy && (
              <DropdownMenu.Item
                onSelect={async () => {
                  const ok = await copy(url);
                  say(ok ? 'Link copied' : 'Copy unavailable. Select the address bar instead.');
                  if (ok) onShare?.('copy');
                }}
              >
                {copyLabel}
              </DropdownMenu.Item>
            )}
            {wantsNative && <DropdownMenu.Item onSelect={native}>{nativeLabel}</DropdownMenu.Item>}
            {links.map((link) => (
              <DropdownMenu.Item key={link.id} asChild onSelect={() => onShare?.(link.id)}>
                <a href={link.href} {...external(link)}>
                  {link.label}
                </a>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <p role="status" className={s.status}>
          {status}
        </p>
      </div>
    );

  return (
    <div {...props} className={`${s.root} ${className}`} data-part="share-menu">
      <div role="group" aria-label={label} className={s.row}>
        {wantsCopy && (
          <CopyButton
            value={url}
            label={copyLabel}
            copiedLabel="Link copied"
            failedLabel="Copy unavailable. Select the address bar instead."
            size="sm"
            onCopy={(ok) => {
              if (ok) onShare?.('copy');
            }}
          />
        )}
        {wantsNative && (
          <Button variant="outline" size="sm" onClick={native}>
            <AIIcon name="external" />
            {nativeLabel}
          </Button>
        )}
        {links.map((link) => (
          <LinkButton
            key={link.id}
            variant="outline"
            size="sm"
            href={link.href}
            {...external(link)}
            onClick={() => onShare?.(link.id)}
          >
            {link.label}
          </LinkButton>
        ))}
      </div>
      <p role="status" className={s.status}>
        {status}
      </p>
    </div>
  );
}
