import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarketingTemplate } from './marketing-template';

describe('Folio marketing template', () => {
  it('uses all eight blocks with one page heading and real section destinations', () => {
    const { container } = render(<MarketingTemplate />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const name of [
      'header',
      'footer',
      'hero',
      'features',
      'pricing',
      'faq',
      'contact',
      'article',
    ])
      expect(container.querySelector(`.uim-${name}`)).not.toBeNull();
    for (const link of container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      expect(document.getElementById(link.hash.slice(1))).not.toBeNull();
    expect(screen.getByText(/These prices and features are sample content/)).toBeVisible();
    expect(screen.getByText(/Folio is a fictional product. All content/)).toBeVisible();
  });

  it('changes the actual project tab and preserves keyboard tab semantics', async () => {
    const user = userEvent.setup();
    render(<MarketingTemplate />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Notes' })).toHaveTextContent(
      'Keep the brief short',
    );
    expect(screen.queryByText('A quieter way to plan')).not.toBeInTheDocument();
  });

  it('selects an illustrative plan without claiming a subscription', async () => {
    const user = userEvent.setup();
    render(<MarketingTemplate />);
    await user.click(screen.getByRole('button', { name: 'Explore Studio' }));
    expect(screen.getByRole('button', { name: 'Explore Studio' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Studio selected in this preview. No subscription was created.',
    );
    await user.click(screen.getByRole('button', { name: 'Explore Personal' }));
    expect(screen.getByRole('button', { name: 'Explore Studio' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Personal selected');
  });

  it('opens the FAQ with the keyboard and states contact behavior accurately', async () => {
    const user = userEvent.setup();
    render(<MarketingTemplate />);
    const question = screen.getByRole('button', {
      name: 'Where does the contact form send my message?',
    });
    question.focus();
    await user.keyboard('{Enter}');
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: question.textContent! })).toHaveTextContent(
      'Nothing is transmitted or saved.',
    );
  });

  it('validates a local contact draft, focuses invalid fields and never sends it', async () => {
    const request = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(<MarketingTemplate />);
    const form = screen.getByRole('form', { name: 'What are you working on?' });
    await user.click(within(form).getByRole('button', { name: 'Prepare a draft' }));
    const name = screen.getByRole('textbox', { name: 'Your name' });
    const email = screen.getByRole('textbox', { name: 'Email address' });
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter your name.');
    await user.type(name, 'Ari');
    await user.type(email, 'invalid-email');
    await user.type(
      screen.getByRole('textbox', { name: 'About your project' }),
      '<script>alert(1)</script>',
    );
    await user.click(within(form).getByRole('button', { name: 'Prepare a draft' }));
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription('Enter a valid email address.');
    await user.clear(email);
    await user.type(email, 'ari@example.test');
    await user.click(within(form).getByRole('button', { name: 'Prepare a draft' }));
    expect(within(form).getByRole('status')).toHaveTextContent(
      'Draft prepared locally. Nothing was sent.',
    );
    expect(screen.getByText('<script>alert(1)</script>', { selector: 'p' })).toBeVisible();
    expect(form.querySelector('script')).toBeNull();
    expect(request).not.toHaveBeenCalled();
    await user.type(name, 'a');
    expect(screen.queryByText('Your local draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft prepared locally. Nothing was sent.')).not.toBeInTheDocument();
    request.mockRestore();
  });
});
