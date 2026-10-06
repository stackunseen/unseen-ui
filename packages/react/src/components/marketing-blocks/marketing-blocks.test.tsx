import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  MarketingArticle,
  MarketingContact,
  MarketingFAQ,
  MarketingFeatures,
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
  MarketingPricing,
} from './marketing-blocks.js';

describe('marketing block contracts', () => {
  it('keeps native destinations and returns focus on mobile-menu Escape', async () => {
    const user = userEvent.setup();
    render(
      <MarketingHeader
        brand={<a href="/">Studio</a>}
        links={[{ id: 'work', label: 'Work', href: '/work/' }]}
        actions={<a href="/contact/">Contact</a>}
      />,
    );
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    const link = screen.getByRole('link', { name: 'Work' });
    expect(link).toHaveAttribute('href', '/work/');
    link.focus();
    await user.keyboard('{Escape}');
    expect(menu).toHaveFocus();
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(menu.getAttribute('aria-controls')!)).toHaveAttribute(
      'data-open',
      'false',
    );
  });

  it('keeps FAQ disclosure controlled and renders untrusted answer text as text', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const items = [
      { value: 'source', title: 'Where is this from?', content: '<img src=x onerror=alert(1)>' },
    ];
    const view = (value: string) => (
      <MarketingFAQ title="Questions" items={items} value={value} onValueChange={onValueChange} />
    );
    const { rerender, container } = render(view(''));
    await user.click(screen.getByRole('button', { name: 'Where is this from?' }));
    expect(onValueChange).toHaveBeenCalledWith('source');
    expect(screen.getByRole('button', { name: 'Where is this from?' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    rerender(view('source'));
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('group', { name: 'Where is this from?' })).toBeVisible();
  });

  it('uses host actions for pricing without creating billing state', async () => {
    const choose = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketingPricing
        title="Plans"
        note="Sample prices"
        plans={[
          {
            id: 'studio',
            title: 'Studio',
            description: 'A sample plan',
            price: '$12',
            priceNote: 'per person',
            features: ['Shared notes'],
            action: <button onClick={choose}>Inspect plan</button>,
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Inspect plan' }));
    expect(choose).toHaveBeenCalledOnce();
    expect(screen.getByText('Sample prices')).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Studio' })).toBeVisible();
  });

  it('forwards form behavior, host pending state and acknowledged feedback', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    const view = (busy: boolean, error: boolean) => (
      <MarketingContact
        title="Contact"
        onSubmit={submit}
        aria-busy={busy}
        feedback={
          error
            ? { tone: 'error', message: 'Delivery failed' }
            : { tone: 'info', message: 'Draft only' }
        }
        actions={
          <button type="submit" disabled={busy}>
            Send
          </button>
        }
      >
        <input aria-label="Message" />
      </MarketingContact>
    );
    const { rerender } = render(view(false, false));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Draft only');
    rerender(view(true, true));
    expect(screen.getByRole('form', { name: 'Contact' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Delivery failed');
  });

  it('provides semantic headings, content slots and native root attributes', () => {
    render(
      <>
        <MarketingHero id="home" title="A quiet workspace" actions={<a href="#plans">Plans</a>}>
          <div>Preview slot</div>
        </MarketingHero>
        <MarketingFeatures
          title="Features"
          items={[{ id: 'notes', title: 'Notes', description: 'Keep the context.' }]}
        />
        <MarketingArticle title="A useful trail" meta="Sample editorial">
          <h3>Write the decision</h3>
          <p>Article body</p>
        </MarketingArticle>
        <MarketingFooter
          brand="Studio"
          copyright="Sample content"
          groups={[
            {
              id: 'learn',
              title: 'Learn',
              links: [{ id: 'guide', label: 'Guide', href: '/guide/' }],
            },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'A quiet workspace' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'A quiet workspace' })).toHaveAttribute('id', 'home');
    expect(screen.getByRole('article', { name: 'A useful trail' })).toHaveTextContent(
      'Article body',
    );
    expect(screen.getByRole('navigation', { name: 'Learn' })).toContainElement(
      screen.getByRole('link', { name: 'Guide' }),
    );
    expect(screen.getByText('Preview slot')).toBeVisible();
  });

  it('can render navigation and content on the server without browser APIs', () => {
    const html = renderToString(
      <>
        <MarketingHeader brand="Studio" links={[]} />
        <MarketingHero title="A useful place" />
        <MarketingContact title="Write to us">
          <input name="message" />
        </MarketingContact>
      </>,
    );
    expect(html).toContain('A useful place');
    expect(html).toContain('aria-expanded="false"');
  });

  it.each([2, 3] as const)(
    'embeds a hero at heading level %s without another page heading',
    (headingLevel) => {
      render(
        <>
          <h1>Component documentation</h1>
          <MarketingHero title="Embedded hero" headingLevel={headingLevel} />
        </>,
      );
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(
        screen.getByRole('heading', { level: headingLevel, name: 'Embedded hero' }),
      ).toBeVisible();
    },
  );
});
