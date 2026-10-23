'use client';
import { useSyncExternalStore } from 'react';
import type { ComponentProps, SVGProps } from 'react';
import { DesktopIcon, SunIcon } from '@radix-ui/react-icons';
import { Button } from '../button/button.js';
import { ToggleGroup } from '../toggle-group/toggle-group.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { Appearance } from '../../theme.js';
import { useResolvedAppearance } from './use-stored-appearance.js';
import s from './appearance-toggle.module.css';
import f from '../../shared/styles/feedback.module.css';

export interface AppearanceToggleProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  value: Appearance;
  onValueChange: (next: Appearance) => void;
  /**
   * `cycle`: one button through light, dark and system. `segmented`: three labelled segments.
   * `switch`: a sun and moon pill with only light and dark. `subtle`: one quiet icon that flips
   * between light and dark. The two-option forms start from the system's choice while the value
   * is `system`, and a press stores light or dark.
   */
  variant?: 'cycle' | 'segmented' | 'switch' | 'subtle';
  labels?: Partial<Record<Appearance, string>>;
  /** Names the segmented group. */
  label?: string;
  size?: 'default' | 'sm';
}

const order: readonly Appearance[] = ['light', 'dark', 'system'];
const defaultLabels: Record<Appearance, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
/** A plain filled crescent: the starred moon reads as decoration at toggle size. */
function CrescentGlyph(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg viewBox="0 0 15 15" fill="none" {...props}>
      <path d="M6.43 1.6A6 6 0 1 0 13.4 8.57 5 5 0 0 1 6.43 1.6Z" fill="currentColor" />
    </svg>
  );
}
const glyphs = { light: SunIcon, dark: CrescentGlyph, system: DesktopIcon } as const;
const names = { light: 'sun', dark: 'moon', system: 'monitor' } as const;
const subscribeNever = () => () => {};

/** A neutral mark for the first paint, before the stored choice is known. */
function NeutralGlyph(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg viewBox="0 0 15 15" fill="none" {...props}>
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" />
      <path d="M7.5 2a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
    </svg>
  );
}

/**
 * A light, dark or system choice that drives the theme provider's appearance. The host owns
 * the value, usually through useStoredAppearance. Until hydration it shows a neutral mark, so
 * the first paint never shows the wrong icon.
 */
export function AppearanceToggle({
  value,
  onValueChange,
  variant = 'cycle',
  labels,
  label = 'Appearance',
  size = 'default',
  className = '',
  ...props
}: AppearanceToggleProps) {
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const words = { ...defaultLabels, ...labels };
  const resolved = useResolvedAppearance(value);
  if (variant === 'switch')
    return (
      <div {...props} className={`${s.root} ${className}`} data-part="appearance-toggle">
        <ToggleGroup
          variant="segmented"
          label={label}
          size={size === 'sm' ? 'sm' : 'default'}
          className={s.switch}
          // Nothing is marked until the browser can say which mode "system" means.
          value={hydrated ? resolved : null}
          onValueChange={(next) => {
            if (next === 'light' || next === 'dark') onValueChange(next);
          }}
          options={(['light', 'dark'] as const).map((appearance) => ({
            value: appearance,
            label: (
              <>
                <AIIcon name={names[appearance]} fallbackIcon={glyphs[appearance]} size={16} />
                <span className={f.srOnly}>{words[appearance]}</span>
              </>
            ),
          }))}
        />
      </div>
    );
  if (variant === 'subtle') {
    const dark = hydrated && resolved === 'dark';
    return (
      <div {...props} className={`${s.root} ${className}`} data-part="appearance-toggle">
        <button
          type="button"
          className={s.subtle}
          data-size={size}
          // A stable name with a pressed state, so the label never contradicts what a press does.
          aria-label={`${words.dark} mode`}
          aria-pressed={hydrated ? dark : undefined}
          data-appearance={hydrated ? resolved : undefined}
          onClick={() => onValueChange(dark ? 'light' : 'dark')}
        >
          {hydrated ? (
            <>
              <AIIcon name="sun" fallbackIcon={SunIcon} size={16} className={s.sun} />
              <AIIcon name="moon" fallbackIcon={CrescentGlyph} size={16} className={s.moon} />
            </>
          ) : (
            <AIIcon name="monitor" icon={NeutralGlyph} size={16} />
          )}
        </button>
      </div>
    );
  }
  if (variant === 'segmented')
    return (
      <div {...props} className={`${s.root} ${className}`} data-part="appearance-toggle">
        <ToggleGroup
          variant="segmented"
          label={label}
          size={size === 'sm' ? 'sm' : 'default'}
          value={value}
          onValueChange={(next) => {
            if (next !== null) onValueChange(next as Appearance);
          }}
          options={order.map((appearance) => ({
            value: appearance,
            label: (
              <span className={s.segment}>
                <AIIcon name={names[appearance]} fallbackIcon={glyphs[appearance]} size={14} />
                {words[appearance]}
              </span>
            ),
          }))}
        />
      </div>
    );
  const next = order[(order.indexOf(value) + 1) % order.length]!;
  return (
    <div {...props} className={`${s.root} ${className}`} data-part="appearance-toggle">
      <Button
        variant="ghost"
        size={size}
        className={s.cycle}
        aria-label={
          hydrated ? `${words[value]} mode. Switch to ${words[next].toLowerCase()} mode` : label
        }
        data-appearance={hydrated ? value : undefined}
        onClick={() => onValueChange(next)}
      >
        {hydrated ? (
          <AIIcon name={names[value]} fallbackIcon={glyphs[value]} size={18} />
        ) : (
          <AIIcon name="monitor" icon={NeutralGlyph} size={18} />
        )}
      </Button>
    </div>
  );
}
