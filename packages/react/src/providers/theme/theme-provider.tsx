'use client';
import { createContext, useContext, useId, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { updateTheme, defaultTheme, themeToCSS } from '../../theme.js';
import type { Appearance, ResolvedTheme, ThemeInput } from '../../theme.js';
import styles from '../../shared/styles/styles.module.css';

const ThemeContext = createContext<{
  theme: ResolvedTheme;
  appearance: Appearance;
  scope: string;
} | null>(null);
/** Internal renderer access; public consumers use AITheme and scoped CSS variables. */
export function useRendererTheme() {
  return useContext(ThemeContext);
}
export interface AIThemeProps extends Omit<ComponentProps<'div'>, 'color'> {
  theme?: ResolvedTheme;
  config?: ThemeInput;
  appearance?: Appearance;
  isolated?: boolean;
  nonce?: string;
}
export function AITheme({
  theme,
  config,
  appearance,
  isolated,
  nonce,
  className = '',
  children,
  ...props
}: AIThemeProps) {
  const parent = useContext(ThemeContext);
  const scope = `ai${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const inherited = isolated ? defaultTheme : (parent?.theme ?? defaultTheme);
  const resolved = useMemo(
    () => theme ?? (config ? updateTheme(inherited, config) : inherited),
    [theme, config, inherited],
  );
  const mode = appearance ?? (isolated ? 'system' : parent?.appearance) ?? 'system';
  const css = useMemo(() => themeToCSS(resolved, scope, mode), [resolved, scope, mode]);
  const context = useMemo(
    () => ({ theme: resolved, appearance: mode, scope }),
    [resolved, mode, scope],
  );
  return (
    <ThemeContext.Provider value={context}>
      <style nonce={nonce}>{css}</style>
      <div
        {...props}
        data-ai-theme={scope}
        data-appearance={mode}
        className={`${styles.scope} ${className}`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
/**
 * ThemeSurface's class and attributes, for portal content that must be the direct child of its
 * Radix Portal. A wrapper there hides the content's exit animation from Radix, which then removes
 * the content at once instead of letting it fade out.
 */
export function useThemeScope() {
  const context = useContext(ThemeContext);
  return {
    scope: styles.scope,
    attributes: {
      'data-ai-theme': context?.scope,
      'data-appearance': context?.appearance,
    },
  };
}

/** Reapply the originating selector to a portal without mutating body/root styles. */
export function ThemeSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(ThemeContext);
  return (
    <div
      className={`${styles.scope} ${className}`}
      data-ai-theme={context?.scope}
      data-appearance={context?.appearance}
    >
      {children}
    </div>
  );
}
