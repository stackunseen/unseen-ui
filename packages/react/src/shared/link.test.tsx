import { cleanup, render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { LinkProvider, useLinkComponent } from './link.js';
import type { LinkComponentProps } from './link.js';
import { Chip } from '../components/chip/chip.js';
import { Button } from '../components/button/button.js';
import { Card } from '../components/card/card.js';
import { Matrix } from '../components/matrix/matrix.js';
import { ToggleGroup } from '../components/toggle-group/toggle-group.js';
import { Stepper } from '../components/stepper/stepper.js';

afterEach(cleanup);

/** Stands in for a router link: a native anchor marked so tests can tell it apart. */
const RouterLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(function RouterLink(
  { href, ...props },
  ref,
) {
  return <a {...props} href={href} ref={ref} data-router="" />;
});

function Everything() {
  return (
    <>
      <Chip href="/lens/agents" active>
        Agents
      </Chip>
      <ToggleGroup
        variant="segmented"
        label="View"
        mode="links"
        value="latest"
        options={[
          { value: 'latest', label: 'Latest', href: '/journal/' },
          { value: 'grouped', label: 'By discipline', href: '/journal/?view=grouped' },
        ]}
      />
      <Stepper
        label="Parts"
        steps={[
          { id: '1', label: 'One', href: '/s/1', state: 'done' },
          { id: '2', label: 'Two', href: '/s/2', state: 'current' },
        ]}
        previous={{ href: '/s/1' }}
        next={{ href: '/s/3' }}
      />
      <Card href="/guides/rag">
        <Card.Title>RAG guide</Card.Title>
      </Card>
      <Button href="/start">Start</Button>
      <Matrix
        label="Coverage"
        rows={[{ id: 'rag', label: 'RAG', href: '/d/rag' }]}
        columns={[{ id: 'guides', label: 'Guides' }]}
        value={() => 3}
        href={(row, column) => `/${row.id}/${column.id}`}
      />
    </>
  );
}

describe('LinkProvider', () => {
  it('renders native anchors when no provider is set', () => {
    render(<Everything />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(11);
    for (const link of links) expect(link).not.toHaveAttribute('data-router');
  });

  it('routes every link-rendering component through the host link, with href and aria-current', () => {
    render(
      <LinkProvider component={RouterLink}>
        <Everything />
      </LinkProvider>,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(11);
    for (const link of links) expect(link).toHaveAttribute('data-router');
    expect(screen.getByRole('link', { name: 'Agents' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Latest' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Two, current' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/start');
    expect(screen.getByRole('link', { name: 'RAG' })).toHaveAttribute('href', '/d/rag');
    expect(screen.getByRole('link', { name: 'RAG guide' })).toHaveAttribute('href', '/guides/rag');
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/rag/guides');
  });

  it('keeps disabled links native and without a destination', () => {
    render(
      <LinkProvider component={RouterLink}>
        <Chip href="/lens/agents" disabled>
          Agents
        </Chip>
        <ToggleGroup
          label="View"
          mode="links"
          value="latest"
          options={[{ value: 'latest', label: 'Latest', href: '/journal/', disabled: true }]}
        />
      </LinkProvider>,
    );
    for (const anchor of document.querySelectorAll('a')) {
      expect(anchor).not.toHaveAttribute('href');
      expect(anchor).not.toHaveAttribute('data-router');
      expect(anchor).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('renders on the server with and without a provider', () => {
    expect(renderToString(<Everything />)).toContain('href="/guides/rag"');
    const html = renderToString(
      <LinkProvider component={RouterLink}>
        <Everything />
      </LinkProvider>,
    );
    expect(html).toContain('data-router=""');
  });

  it('exposes the component to hosts that render their own anchors', () => {
    function Custom() {
      const Component = useLinkComponent();
      return Component ? <Component href="/custom">Custom</Component> : <a href="/custom">Plain</a>;
    }
    render(
      <LinkProvider component={RouterLink}>
        <Custom />
      </LinkProvider>,
    );
    expect(screen.getByRole('link', { name: 'Custom' })).toHaveAttribute('data-router');
  });
});
