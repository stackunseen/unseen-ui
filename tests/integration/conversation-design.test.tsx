import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AITheme,
  Attachment,
  IconsProvider,
  LoadingIndicator,
  MessageActions,
  SlashCommandMenu,
  StatusBadge,
} from '@stackunseen/ui';
import styles from '../../packages/react/src/shared/styles/styles.module.css';
import iconStyles from '../../packages/react/src/components/icon-button/icon-button.module.css';
import agentStyles from '../../packages/react/src/shared/styles/agent-controls.module.css';
import labelStyles from '../../packages/react/src/shared/styles/presentation-labels.module.css';

const insertedStyles: HTMLStyleElement[] = [];

afterEach(() => {
  insertedStyles.splice(0).forEach((style) => style.remove());
  vi.unstubAllGlobals();
});

/** Activate only the coarse-pointer condition in jsdom's CSS cascade, without pretending it has touch/layout. */
function fixtureCSS(css: string, names: Record<string, string>, coarse: boolean) {
  let processed = '';
  let cursor = 0;
  const rule = /@(media|container)\s*([^{}]+)\{/g;
  for (;;) {
    rule.lastIndex = cursor;
    const match = rule.exec(css);
    if (!match) {
      processed += css.slice(cursor);
      break;
    }
    processed += css.slice(cursor, match.index);
    const bodyStart = rule.lastIndex;
    let depth = 1;
    let end = bodyStart;
    for (; depth && end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    if (match[1] === 'media' && match[2]?.trim() === '(any-pointer: coarse)' && coarse)
      processed += css.slice(bodyStart, end - 1);
    cursor = end;
  }
  const locals = new Set(
    [...processed.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((match) => match[1]!),
  );
  // Vitest's CSS-module proxy has no enumerable keys. Reading each actual
  // selector property obtains the same scoped class used by the real component.
  for (const name of locals)
    processed = processed.replace(
      new RegExp(`\\.${name}(?=[^a-zA-Z0-9_-]|$)`, 'g'),
      `.${names[name]}`,
    );
  return processed;
}

function addPresentationCSS(coarse: boolean) {
  const style = document.createElement('style');
  const sources = [
    ['shared/styles/styles.module.css', styles],
    ['components/icon-button/icon-button.module.css', iconStyles],
    ['shared/styles/agent-controls.module.css', agentStyles],
    ['shared/styles/presentation-labels.module.css', labelStyles],
  ] as const;
  style.textContent = sources
    .map(([file, names]) =>
      fixtureCSS(
        readFileSync(
          resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/react/src', file),
          'utf8',
        ),
        names,
        coarse,
      ),
    )
    .join('\n');
  document.head.append(style);
  insertedStyles.push(style);
  expect(style.sheet?.cssRules.length).toBeGreaterThan(0);
}

describe('conversation design refinements', () => {
  it('bounds status and loading labels while keeping public status text and decorative glyphs separate', () => {
    addPresentationCSS(false);
    const label = `Waiting for ${'workspace-reference/'.repeat(12)}`;
    render(
      <AITheme>
        <div style={{ width: 180 }}>
          <StatusBadge state="outcome-unknown" label={label} />
          <LoadingIndicator label={`Loading ${label}`} />
        </div>
      </AITheme>,
    );
    const badge = screen.getByText(label).closest('[data-part="status"]')!;
    const loading = screen.getByRole('status');
    expect(getComputedStyle(badge).whiteSpace).toBe('normal');
    expect(getComputedStyle(badge).maxInlineSize).toBe('100%');
    expect(getComputedStyle(screen.getByText(label)).minInlineSize).toBe('0');
    expect(getComputedStyle(loading).maxInlineSize).toBe('100%');
    expect(getComputedStyle(screen.getByText(`Loading ${label}`)).overflowWrap).toBe('anywhere');
    expect(getComputedStyle(loading.firstElementChild!).flexShrink).toBe('0');
    expect(loading).toHaveTextContent(`Loading ${label}`);
    expect(badge.querySelector('[data-ai-icon]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps coarse minimums despite compact styles and null action glyphs in the CSS cascade', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    addPresentationCSS(true);
    render(
      <AITheme config={{ density: 'compact' }}>
        <Attachment variant="compact" state="ready" name="Architecture.pdf" onOpen={() => {}} />
        <IconsProvider icons={{ copy: null }}>
          <MessageActions variant="compact" text="Public answer" />
        </IconsProvider>
        <SlashCommandMenu
          variant="compact"
          query=""
          onQueryChange={() => {}}
          onSelect={() => {}}
          items={[{ id: 'search', label: 'Search', description: 'Search workspace' }]}
        />
      </AITheme>,
    );
    expect(getComputedStyle(screen.getByRole('button', { name: 'Open original' })).minHeight).toBe(
      '44px',
    );
    expect(getComputedStyle(screen.getByRole('button', { name: 'Copy' })).minHeight).toBe('44px');
    expect(
      getComputedStyle(screen.getByRole('combobox', { name: 'Find a command' })).minHeight,
    ).toBe('44px');
  });
});
