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
import { Cross2Icon, HamburgerMenuIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { BrandMark } from './brand-mark';
import { AITheme, AppearanceToggle, IconsProvider, LinkProvider } from '@stackunseen/ui';
import { createTheme, exportTheme, importTheme } from '@stackunseen/ui/theme';
import type { Appearance, ResolvedTheme } from '@stackunseen/ui/theme';
import { lucideIcons } from './gallery-icons';
import { isSiteSectionActive, siteNavigation } from '../lib/site-navigation';
import { libraryVersion } from '../lib/library-version';

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
        <LinkProvider component={Link}>
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
                  <BrandMark size={24} />
                </span>
                <span>
                  unseen<span className="web-brand-dot">.</span>ui
                  <small>by Stack Unseen</small>
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
                  <MagnifyingGlassIcon width={15} height={15} aria-hidden="true" />
                </a>
                {/* Two choices, as most sites offer; System stays the start until one is picked. */}
                <AppearanceToggle
                  variant="switch"
                  size="sm"
                  label="Color mode"
                  value={appearance}
                  onValueChange={setAppearance}
                />
                <Link
                  className="web-header-cta"
                  href="/getting-started/"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
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
                      requestAnimationFrame(() =>
                        navigationRef.current?.querySelector('a')?.focus(),
                      );
                    }
                  }}
                >
                  {menuOpen ? (
                    <Cross2Icon width={15} height={15} aria-hidden="true" />
                  ) : (
                    <HamburgerMenuIcon width={15} height={15} aria-hidden="true" />
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
                  unseen<span className="web-brand-dot">.</span>ui
                </Link>
                <span>by Stack Unseen</span>
              </div>
              <nav aria-label="Footer navigation">
                {siteNavigation.map(([label, href]) => (
                  <Link key={href} prefetch={false} onClick={() => setMenuOpen(false)} href={href}>
                    {label}
                  </Link>
                ))}
                <a href="/llms.txt">llms.txt</a>
              </nav>
              <span className="web-footer-version">
                <span>v{libraryVersion}</span>
                <span>experimental alpha</span>
                <span>MIT</span>
              </span>
            </footer>
          </AITheme>
        </LinkProvider>
      </IconsProvider>
    </ThemeContext.Provider>
  );
}
