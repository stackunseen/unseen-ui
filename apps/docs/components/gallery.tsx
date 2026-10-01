'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  BookOpen,
  Code2,
  Menu,
  Moon,
  Palette,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { AITheme, IconsProvider, Accordion } from '@ai-interaction/react';
import { createTheme } from '@ai-interaction/react/theme';
import type { Appearance } from '@ai-interaction/react/theme';
import { catalog } from '../lib/catalog';
import type { CatalogEntry } from '../lib/catalog';
import {
  aiGroups,
  componentSection,
  gallerySection,
  navigationGroup,
  searchCatalog,
  sectionCatalog,
  sectionLabels,
  uiGroups,
} from '../lib/gallery-navigation';
import type { GallerySection } from '../lib/gallery-navigation';
import { changeGalleryLocation, galleryHref, readGalleryLocation } from '../lib/gallery-location';
import type { GalleryLocation, GalleryView } from '../lib/gallery-location';
import { ComponentDetail } from './component-detail';
import { lucideIcons } from './gallery-icons';
import { ExampleLoading } from './example-loading';

const ThemeEditor = dynamic(() => import('./theme-editor').then((m) => m.ThemeEditor), {
  loading: ExampleLoading,
});
const DesignGuide = dynamic(() => import('./design-guide').then((m) => m.DesignGuide), {
  loading: ExampleLoading,
});
const Workbench = dynamic(() => import('./workbench').then((m) => m.Workbench), {
  loading: ExampleLoading,
});
const CodingStudio = dynamic(() => import('./coding-studio').then((m) => m.CodingStudio), {
  loading: ExampleLoading,
});
const Templates = dynamic(() => import('./templates').then((m) => m.Templates), {
  loading: ExampleLoading,
});

const navigationEvent = 'gallery:navigate';
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(navigationEvent, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(navigationEvent, listener);
  };
}
const browserSearch = () => window.location.search;
const serverSearch = () => '';
const workspaces: { view: GalleryView; label: string; icon: typeof Blocks }[] = [
  { view: 'components', label: 'Components', icon: Blocks },
  { view: 'workbench', label: 'Agent workbench', icon: Code2 },
  { view: 'coding', label: 'Coding studio', icon: Code2 },
  { view: 'templates', label: 'Templates', icon: Blocks },
  { view: 'theme', label: 'Theme studio', icon: Palette },
  { view: 'design', label: 'Design foundations', icon: BookOpen },
];
function focusContent() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus({ preventScroll: true });
  });
}
function LocalLink({
  location,
  onNavigate,
  children,
  ...props
}: {
  location: GalleryLocation;
  onNavigate: (location: GalleryLocation) => void;
  children: ReactNode;
  className?: string;
  'aria-current'?: 'page';
  'aria-label'?: string;
}) {
  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    onNavigate(location);
  }
  return (
    <a href={galleryHref(location)} onClick={click} {...props}>
      {children}
    </a>
  );
}

export function Gallery({ initialView = 'components' }: { initialView?: GalleryView }) {
  const search = useSyncExternalStore(subscribe, browserSearch, serverSearch);
  const location = readGalleryLocation(search, initialView);
  const { view } = location;
  const entry = catalog.find((item) => item.name === location.component)!;
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [workbenchVisited, setWorkbenchVisited] = useState(false);
  const [theme, setTheme] = useState(createTheme);
  const [appearance, setAppearance] = useState<Appearance>('light');
  const [iconSet, setIconSet] = useState<'default' | 'lucide'>('default');
  const searchInput = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const title =
    view === 'components' ? entry.name : workspaces.find((item) => item.view === view)!.label;
  useEffect(() => {
    if (view === 'workbench') setWorkbenchVisited(true);
  }, [view]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.key === 'Escape' &&
        menuOpen &&
        !document.querySelector('[role="dialog"], [role="listbox"]')
      ) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector('[role="dialog"], [role="listbox"]') ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))
      )
        return;
      event.preventDefault();
      setMenuOpen(true);
      requestAnimationFrame(() => searchInput.current?.focus());
    }
    function restore() {
      setMenuOpen(false);
      focusContent();
    }
    window.addEventListener('keydown', keyboard);
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('popstate', restore);
    };
  }, [menuOpen]);

  function navigate(next: GalleryLocation) {
    const destination = galleryHref(next);
    if (destination !== window.location.search) {
      window.history.pushState(null, '', destination);
      window.dispatchEvent(new Event(navigationEvent));
    }
    if (next.component !== location.component || next.view !== view || menuOpen) {
      setMenuOpen(false);
      focusContent();
    }
  }
  const change = (patch: Partial<GalleryLocation>) =>
    navigate(changeGalleryLocation(location, patch));
  const section = gallerySection(view, entry);
  const searching = query.trim().length > 0;
  const filtered = searching ? searchCatalog(query) : sectionCatalog(section);
  const groupNames = section === 'ui' ? uiGroups : aiGroups;
  const destinations: {
    section: GallerySection;
    icon: typeof Blocks;
    location: GalleryLocation;
  }[] = [
    {
      section: 'ui',
      icon: Blocks,
      location: changeGalleryLocation(location, {
        view: 'components',
        component: componentSection(entry) === 'ui' ? entry.name : 'Button',
      }),
    },
    {
      section: 'ai',
      icon: Code2,
      location: changeGalleryLocation(location, {
        view: 'components',
        component: componentSection(entry) === 'ai' ? entry.name : 'PromptInput',
      }),
    },
    {
      section: 'patterns',
      icon: BookOpen,
      location: changeGalleryLocation(location, {
        view: view === 'coding' || view === 'templates' ? view : 'workbench',
      }),
    },
    {
      section: 'customize',
      icon: Palette,
      location: changeGalleryLocation(location, { view: view === 'design' ? 'design' : 'theme' }),
    },
  ];
  const index = filtered.findIndex((item) => item.name === entry.name);
  const previous = index > 0 ? filtered[index - 1] : undefined;
  const next = index >= 0 ? filtered[index + 1] : undefined;
  const entryLocation = (component: string) =>
    changeGalleryLocation(location, { view: 'components', component });
  const componentLink = (item: CatalogEntry, showGroup = false) => (
    <LocalLink
      key={item.name}
      className={`component-link ${view === 'components' && entry.name === item.name ? 'active' : ''}`}
      aria-current={view === 'components' && entry.name === item.name ? 'page' : undefined}
      aria-label={item.name}
      location={entryLocation(item.name)}
      onNavigate={(next) => {
        setQuery('');
        navigate(next);
      }}
    >
      {item.name}
      {showGroup && <small aria-hidden="true">{navigationGroup(item)}</small>}
    </LocalLink>
  );

  return (
    <IconsProvider icons={iconSet === 'lucide' ? lucideIcons : {}}>
      <title>{`${title} · Unseen UI`}</title>
      <AITheme theme={theme} appearance={appearance} className="site explorer-site">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <button
            ref={menuButton}
            type="button"
            className="mobile-menu"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="library-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <LocalLink
            className="brand"
            location={entryLocation('PromptInput')}
            onNavigate={navigate}
            aria-label="Unseen UI home"
          >
            <span className="brand-mark">
              <Blocks size={21} aria-hidden="true" />
            </span>
            <span>Unseen UI</span>
          </LocalLink>
          <span className="header-divider" />
          <span className="header-label">Component explorer</span>
          <div className="header-links">
            <a href="/getting-started/">
              Getting started <ArrowRight size={14} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="appearance-toggle"
              aria-label={appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setAppearance(appearance === 'dark' ? 'light' : 'dark')}
            >
              {appearance === 'dark' ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>
            <span className="version-label">v0.1 alpha</span>
          </div>
        </header>
        <div className="site-body">
          <aside
            id="library-navigation"
            className={`sidebar explorer-sidebar ${menuOpen ? 'is-open' : ''}`}
            aria-label="Library navigation"
          >
            <nav className="workspace-nav" aria-label="Library sections">
              {destinations.map(({ section: item, icon: Icon, location: destination }) => (
                <LocalLink
                  key={item}
                  className={`nav-main ${section === item ? 'active' : ''}`}
                  aria-current={section === item ? 'page' : undefined}
                  location={destination}
                  onNavigate={(next) => {
                    setQuery('');
                    navigate(next);
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{sectionLabels[item]}</span>
                  {(item === 'ui' || item === 'ai') && (
                    <small aria-hidden="true">{sectionCatalog(item).length}</small>
                  )}
                </LocalLink>
              ))}
              <a className="nav-main getting-started-link" href="/getting-started/">
                <BookOpen size={16} aria-hidden="true" />
                <span>Getting started</span>
              </a>
            </nav>
            <div className="library-search">
              <label className="search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  ref={searchInput}
                  type="search"
                  aria-label="Search components"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a component…"
                />
                <kbd aria-hidden="true">/</kbd>
              </label>
              <p className="library-count" role="status">
                {searching
                  ? `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'} across all components`
                  : section === 'ui' || section === 'ai'
                    ? `${filtered.length} ${section === 'ui' ? 'UI' : 'AI'} components`
                    : section === 'patterns'
                      ? 'Components working together'
                      : 'Theme, icons and design guidance'}
              </p>
            </div>
            <nav
              className="explorer-library"
              aria-label={
                searching || section === 'ui' || section === 'ai'
                  ? 'Components'
                  : sectionLabels[section]
              }
            >
              {searching ? (
                (['ui', 'ai'] as const).map((resultSection) => {
                  const items = filtered.filter((item) => componentSection(item) === resultSection);
                  return items.length ? (
                    <section className="component-group" key={resultSection}>
                      <h2>{sectionLabels[resultSection]}</h2>
                      {items.map((item) => componentLink(item, true))}
                    </section>
                  ) : null;
                })
              ) : section === 'ui' || section === 'ai' ? (
                <Accordion
                  key={`${section}:${entry.name}`}
                  type="single"
                  collapsible
                  region={false}
                  headingLevel={2}
                  className="catalog-groups"
                  defaultValue={navigationGroup(entry)}
                  items={groupNames
                    .map((group) => ({
                      value: group,
                      title: (
                        <span className="catalog-group-label">
                          {group}
                          <small aria-hidden="true">
                            {filtered.filter((item) => navigationGroup(item) === group).length}
                          </small>
                        </span>
                      ),
                      content: (
                        <div className="component-group-links">
                          {filtered
                            .filter((item) => navigationGroup(item) === group)
                            .map((item) => componentLink(item))}
                        </div>
                      ),
                    }))
                    .filter((item) =>
                      filtered.some((entry) => navigationGroup(entry) === item.value),
                    )}
                />
              ) : (
                <div className="section-links">
                  {(section === 'patterns'
                    ? ['workbench', 'coding', 'templates']
                    : ['theme', 'design']
                  ).map((item) => {
                    const workspace = workspaces.find((workspace) => workspace.view === item)!;
                    return (
                      <LocalLink
                        key={item}
                        className={`component-link ${view === item ? 'active' : ''}`}
                        aria-current={view === item ? 'page' : undefined}
                        location={changeGalleryLocation(location, { view: workspace.view })}
                        onNavigate={navigate}
                      >
                        {workspace.label}
                      </LocalLink>
                    );
                  })}
                  {section === 'customize' && (
                    <a className="component-link" href="/getting-started/#customize">
                      Customization and icons
                    </a>
                  )}
                  <p className="section-description">
                    {section === 'patterns'
                      ? 'Try component combinations with a simulated host.'
                      : 'Customize the theme, icons and component styles.'}
                  </p>
                </div>
              )}
              {searching && !filtered.length && (
                <div className="empty-library">
                  <p>No matching components.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchInput.current?.focus();
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </nav>
          </aside>
          <main id="main-content" className="main-content explorer-main" tabIndex={-1}>
            <div className="explorer-context">
              <span>
                {view === 'components'
                  ? `${sectionLabels[section]} / ${navigationGroup(entry)}`
                  : `${sectionLabels[section]} / ${workspaces.find((item) => item.view === view)?.label}`}
              </span>
              {view === 'components' && (
                <nav className="component-pagination" aria-label="Browse components">
                  {previous && (
                    <LocalLink
                      location={entryLocation(previous.name)}
                      onNavigate={navigate}
                      aria-label={`Previous component: ${previous.name}`}
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                      <span>Previous</span>
                    </LocalLink>
                  )}
                  {next && (
                    <LocalLink
                      location={entryLocation(next.name)}
                      onNavigate={navigate}
                      aria-label={`Next component: ${next.name}`}
                    >
                      <span>Next</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </LocalLink>
                  )}
                </nav>
              )}
            </div>
            {view === 'components' ? (
              <ComponentDetail
                key={entry.name}
                entry={entry}
                location={location}
                onChange={change}
              />
            ) : view === 'coding' ? (
              <CodingStudio />
            ) : view === 'templates' ? (
              <Templates />
            ) : view === 'design' ? (
              <DesignGuide theme={theme} onCustomize={() => change({ view: 'theme' })} />
            ) : view === 'theme' ? (
              <ThemeEditor
                theme={theme}
                onChange={setTheme}
                appearance={appearance}
                onAppearanceChange={setAppearance}
                iconSet={iconSet}
                onIconSetChange={setIconSet}
              />
            ) : (
              <div className="page-heading">
                <span className="eyebrow">WORKING TOGETHER</span>
                <h1>From request to resolution.</h1>
                <p>
                  Follow the steps, review an action and inspect the result in this locally
                  simulated workflow.
                </p>
              </div>
            )}
            {(view === 'workbench' || workbenchVisited) && (
              <div hidden={view !== 'workbench'}>
                <Workbench />
              </div>
            )}
            <footer className="page-footer">
              <span>Unseen UI by Stack Unseen</span>
              <span>Experimental components · Local sample data</span>
            </footer>
          </main>
        </div>
      </AITheme>
    </IconsProvider>
  );
}
