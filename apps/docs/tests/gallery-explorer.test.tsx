import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { changeGalleryLocation, galleryHref, readGalleryLocation } from '../lib/gallery-location';
import { catalog, catalogGroup, catalogStyles, categories, filterCatalog } from '../lib/catalog';
import {
  componentSections,
  sectionGroups,
  componentSection,
  gallerySection,
  navigationGroup,
  searchCatalog,
  sectionCatalog,
} from '../lib/gallery-navigation';
import { HandoffSpecimen, PermissionSpecimen } from '../components/scoped-decision-specimen';
import {
  executeHandoff,
  executePermission,
  handoffFixture,
  lookupHandoff,
  lookupPermission,
  permissionFixture,
} from '../lib/decision-demo-host';

describe('gallery links', () => {
  it('maps every component to one scoped navigation group without changing its identity', () => {
    expect(sectionCatalog('ui')).toHaveLength(67);
    expect(sectionCatalog('ai')).toHaveLength(82);
    expect(
      new Set(
        componentSections.flatMap((section) => sectionCatalog(section)).map((entry) => entry.name),
      ).size,
    ).toBe(catalog.length);
    for (const entry of catalog) {
      expect(sectionGroups(componentSection(entry))).toContain(navigationGroup(entry));
      expect(gallerySection('components', entry)).toBe(componentSection(entry));
    }
    expect(sectionCatalog('patterns')).toEqual([]);
    expect(sectionCatalog('customize')).toEqual([]);
    expect(gallerySection('workbench', catalog[0]!)).toBe('templates');
    expect(gallerySection('theme', catalog[0]!)).toBe('customize');
  });
  it('keeps component search global across sections and familiar aliases', () => {
    expect(searchCatalog('form').map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['Input', 'AIForm']),
    );
    expect(searchCatalog('drawer').map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['Modal', 'Sidecar']),
    );
    expect(searchCatalog('theme').length).toBeGreaterThan(0);
    expect(searchCatalog('saving navigation')).toEqual([]);
    expect(searchCatalog('site navigation').map((entry) => entry.name)).not.toEqual(
      expect.arrayContaining(['MarketingHeader', 'MarketingFooter']),
    );
    expect(searchCatalog('OrgSwitcher')).toEqual([]);
    expect(filterCatalog('OrgSwitcher').map((entry) => entry.name)).toContain('OrgSwitcher');
  });
  it('places each public demo in a named discovery group', () => {
    expect(categories).toHaveLength(12);
    expect(new Set(filterCatalog('').map((entry) => entry.name)).size).toBe(catalog.length);
    expect(catalog.every((entry) => categories.includes(catalogGroup(entry)))).toBe(true);
    expect(filterCatalog('', 'Forms').map((entry) => entry.name)).toContain('Select');
    expect(filterCatalog('', 'Forms').map((entry) => entry.name)).not.toContain('AIForm');
    expect(filterCatalog('', 'AI Components').map((entry) => entry.name)).toContain('AIForm');
  });
  it('finds real Modal and Sidecar entries through familiar overlay aliases', () => {
    expect(filterCatalog('dialog').map((entry) => entry.name)).toContain('Modal');
    expect(filterCatalog('drawer').map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['Modal', 'Sidecar']),
    );
    expect(filterCatalog('sheet', 'Overlays').map((entry) => entry.name)).toContain('Modal');
    expect(filterCatalog('', 'Navigation').map((entry) => entry.name)).not.toContain(
      'SlashCommandMenu',
    );
  });
  it('roundtrips every supported generic presentation without inventing variant props', () => {
    for (const entry of catalog.filter((entry) => entry.presentations)) {
      for (const style of catalogStyles(entry)) {
        const location = readGalleryLocation(
          `?component=${entry.name}&style=${style}&state=${encodeURIComponent(entry.states[0]!)}&compare=true`,
        );
        expect(location.component).toBe(entry.name);
        expect(location.style).toBe(style);
        expect(readGalleryLocation(galleryHref(location))).toEqual(location);
      }
    }
    expect(catalog.find((entry) => entry.name === 'Panel')?.presentationProp).toBeNull();
    expect(catalog.find((entry) => entry.name === 'Modal')?.presentationProp).toBe('layout');
  });
  it('roundtrips a complete deep link including a spaced fixture name', () => {
    const location = readGalleryLocation(
      '?component=PermissionRequest&style=compact&state=Scope+changed&tab=code&compare=true&width=375',
    );
    expect(readGalleryLocation(galleryHref(location))).toEqual(location);
    expect(location).toMatchObject({
      component: 'PermissionRequest',
      state: 'Scope changed',
      style: 'compact',
      tab: 'code',
      compare: true,
      width: '375',
    });
  });
  it('rejects unknown URL values and preserves the standalone design route default', () => {
    expect(
      readGalleryLocation(
        '?component=unknown&style=invalid&state=missing&tab=x&width=-1&view=unknown',
        'design',
      ),
    ).toMatchObject({ view: 'design', component: 'PromptInput', width: 'full', tab: 'preview' });
  });
  it('resets fixture-specific choices on component navigation but retains preview width', () => {
    const location = readGalleryLocation(
      '?component=PermissionRequest&state=Scope+changed&compare=true&tab=code&width=640',
    );
    expect(changeGalleryLocation(location, { component: 'Select' })).toMatchObject({
      component: 'Select',
      state: 'Default',
      tab: 'preview',
      compare: false,
      width: '640',
    });
  });
});

describe('gallery scoped host examples', () => {
  it('leaves a permission request unresolved until the sample host acknowledges it', async () => {
    const user = userEvent.setup();
    render(<PermissionSpecimen state="Default" />);
    await user.click(screen.getByRole('button', { name: 'Allow access' }));
    expect(screen.getByText('Permission: requested')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Simulate lost acknowledgement' }));
    await user.click(screen.getByRole('button', { name: 'Check original decision' }));
    expect(screen.queryByText('Permission: granted')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh host snapshot' }));
    expect(screen.getByText('Permission: granted')).toBeVisible();
  });
  it('historical permission lookup does not grant the replacement scope', async () => {
    render(<PermissionSpecimen state="Scope changed" />);
    await userEvent.click(screen.getByRole('button', { name: 'Check original decision' }));
    expect(screen.getByText(/requests accounts:write$/)).toBeVisible();
    expect(screen.getByText('Permission: requested')).toBeVisible();
    expect(screen.queryByText(/Host-confirmed grant/)).not.toBeInTheDocument();
  });
  it('requires a recipient acknowledgement before changing ownership', async () => {
    const user = userEvent.setup();
    render(<HandoffSpecimen state="Default" />);
    await user.click(screen.getByRole('button', { name: /Accept/ }));
    expect(screen.getByText('Current owner: Implementation agent')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Simulate recipient acknowledgement' }));
    expect(screen.getByText('Current owner: Review agent')).toBeVisible();
  });
  it('historical handoff lookup does not transfer the replacement context', async () => {
    render(<HandoffSpecimen state="Context changed" />);
    await userEvent.click(screen.getByRole('button', { name: 'Check original handoff' }));
    expect(screen.getByText('Current owner: Implementation agent')).toBeVisible();
    expect(screen.queryByText('Current owner: Review agent')).not.toBeInTheDocument();
  });
});

describe('sample host execution and lookup boundary', () => {
  it('returns not-found without executing a pending command', () => {
    const pending = permissionFixture('Pending');
    if (pending.submission.state === 'idle') throw new Error('Expected original');
    const lookedUp = lookupPermission(pending, pending.submission.original);
    expect(lookedUp.snapshot).toBe(pending.snapshot);
    expect(lookedUp.snapshot.status).toBe('requested');
    expect(lookedUp.executions).toBe(0);
    expect(lookedUp.storedReceipt).toBeUndefined();
    expect(lookedUp.submission).toMatchObject({ receipt: { outcome: 'not-found' } });
  });
  it('commits a permission before losing its response; lookup only returns the stored receipt', () => {
    const committed = executePermission(permissionFixture('Pending'), true);
    expect(committed.snapshot.status).toBe('granted');
    expect(committed.value.status).toBe('requested');
    expect(committed.submission.state).toBe('outcome-unknown');
    expect(committed.executions).toBe(1);
    if (committed.submission.state === 'idle') throw new Error('Expected original');
    const recovered = lookupPermission(committed, committed.submission.original);
    expect(recovered.snapshot).toBe(committed.snapshot);
    expect(recovered.value).toBe(committed.value);
    expect(recovered.executions).toBe(1);
    expect(executePermission(recovered, false).executions).toBe(1);
  });
  it('commits a handoff before losing its response; lookup does not transfer again', () => {
    const committed = executeHandoff(handoffFixture('Pending'), true);
    expect(committed.snapshot.ownership).toMatchObject({ ownerId: 'Review agent' });
    expect(committed.value.ownership).toMatchObject({ ownerId: 'Implementation agent' });
    expect(committed.executions).toBe(1);
    if (committed.submission.state === 'idle') throw new Error('Expected original');
    const recovered = lookupHandoff(committed, committed.submission.original);
    expect(recovered.snapshot).toBe(committed.snapshot);
    expect(recovered.value).toBe(committed.value);
    expect(recovered.executions).toBe(1);
  });
});
