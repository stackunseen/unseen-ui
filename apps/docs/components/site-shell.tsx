'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { AITheme, IconsProvider } from '@stackunseen/ui';
import { createTheme, exportTheme, importTheme } from '@stackunseen/ui/theme';
import type { Appearance, ResolvedTheme } from '@stackunseen/ui/theme';
import { lucideIcons } from './gallery-icons';
import { isSiteSectionActive, siteNavigation } from '../lib/site-navigation';

interface SiteTheme {
  theme: ResolvedTheme;
  setTheme: (theme: ResolvedTheme) => void;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  iconSet: 'default' | 'lucide';
  setIconSet: (icons: 'default' | 'lucide') => void;
}
const ThemeContext = createContext<SiteTheme | null>(null);
const subscribeSystemAppearance = (listener: () => void) => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const systemAppearance = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
export function useSiteTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Site theme requires SiteShell');
  return context;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState(createTheme);
  const [appearance, updateAppearance] = useState<Appearance>('system');
  const [iconSet, updateIcons] = useState<'default' | 'lucide'>('default');
  const [menuOpen, setMenuOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const path = usePathname();
  useEffect(() => {
    try {
      const saved = localStorage.getItem('unseen-ui-appearance');
      if (saved === 'light' || saved === 'dark' || saved === 'system') updateAppearance(saved);
      const config = localStorage.getItem('unseen-ui-theme');
      if (config) updateTheme(importTheme(config));
      if (localStorage.getItem('unseen-ui-icons') === 'lucide') updateIcons('lucide');
    } catch {
      /* Browsing and previews work when storage is unavailable. */
    }
  }, []);
  function save(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Optional preference persistence. */
    }
  }
  const setTheme = (next: ResolvedTheme) => {
    updateTheme(next);
    save('unseen-ui-theme', exportTheme(next));
  };
  const setAppearance = (next: Appearance) => {
    updateAppearance(next);
    save('unseen-ui-appearance', next);
  };
  const setIconSet = (next: 'default' | 'lucide') => {
    updateIcons(next);
    save('unseen-ui-icons', next);
  };
  function closeMenu() {
    setMenuOpen(false);
    button.current?.focus();
  }
  const systemDark = useSyncExternalStore(subscribeSystemAppearance, systemAppearance, () => false);
  const dark = appearance === 'dark' || (appearance === 'system' && systemDark);
  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, appearance, setAppearance, iconSet, setIconSet }}
    >
      <IconsProvider icons={iconSet === 'lucide' ? lucideIcons : {}}>
        <AITheme
          theme={theme}
          appearance={appearance}
          className="unseen-web"
          data-site-appearance={dark ? 'dark' : 'light'}
        >
          <a className="web-skip" href="#main-content">
            Skip to content
          </a>
          <header className="web-header">
            <Link
              onClick={() => setMenuOpen(false)}
              className="web-brand"
              href="/"
              aria-label="Unseen UI home"
            >
              <span className="web-mark">
                <BrandMark size={28} />
              </span>
              <span>
                Unseen UI<small>by Stack Unseen</small>
              </span>
            </Link>
            <nav
              ref={navigationRef}
              className={`web-nav ${menuOpen ? 'open' : ''}`}
              id="site-navigation"
              aria-label="Main navigation"
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeMenu();
              }}
            >
              {siteNavigation.map(([label, href]) => (
                <Link
                  onClick={() => setMenuOpen(false)}
                  key={href}
                  href={href}
                  aria-current={isSiteSectionActive(path, href) ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="web-header-actions">
              <a
                className="web-icon"
                href="/components/#component-search"
                aria-label="Find a component"
              >
                <Search size={18} aria-hidden="true" />
              </a>
              <button
                className="web-icon"
                type="button"
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setAppearance(dark ? 'light' : 'dark')}
              >
                {dark ? (
                  <Sun size={18} aria-hidden="true" />
                ) : (
                  <Moon size={18} aria-hidden="true" />
                )}
              </button>
              <button
                ref={button}
                className="web-icon web-menu"
                type="button"
                aria-controls="site-navigation"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close site menu' : 'Open site menu'}
                onClick={() => {
                  if (menuOpen) closeMenu();
                  else {
                    setMenuOpen(true);
                    requestAnimationFrame(() => navigationRef.current?.querySelector('a')?.focus());
                  }
                }}
              >
                {menuOpen ? (
                  <X size={20} aria-hidden="true" />
                ) : (
                  <Menu size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </header>
          {children}
          <footer className={`web-footer${path === '/' ? '' : ' web-footer-compact'}`}>
            <div>
              <Link
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="web-footer-brand"
                href="/"
              >
                Unseen UI
              </Link>
              {path === '/' && <p>React components by Stack Unseen. Experimental alpha.</p>}
              {path !== '/' && <span>Experimental alpha</span>}
            </div>
            <nav aria-label="Footer navigation">
              {siteNavigation.map(([label, href]) => (
                <Link key={href} prefetch={false} onClick={() => setMenuOpen(false)} href={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </footer>
        </AITheme>
      </IconsProvider>
    </ThemeContext.Provider>
  );
}
