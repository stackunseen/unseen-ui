'use client';
import { useState } from 'react';
import { Breadcrumb, Pagination, Sidebar } from '@ai-interaction/react';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteNavigationSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [page, setPage] = useState(1);
  if (name === 'Breadcrumb')
    return (
      <Breadcrumb
        label="Example location"
        items={
          state === 'Single item'
            ? [{ id: 'current', label: 'Components' }]
            : [
                { id: 'home', label: 'Components', href: '/' },
                {
                  id: 'navigation',
                  label:
                    state === 'Long labels'
                      ? 'Navigation components for project websites'
                      : 'Navigation',
                  href: '/?component=NavigationMenu',
                },
                {
                  id: 'current',
                  label:
                    state === 'Long labels'
                      ? 'A longer breadcrumb label that wraps at narrow widths'
                      : 'Breadcrumb',
                },
              ]
        }
      />
    );
  if (name === 'Sidebar')
    return (
      <Sidebar label="Example sidebar">
        <Sidebar.Group label="Component library">
          <Sidebar.Link href="/?component=Button">Foundations</Sidebar.Link>
          <Sidebar.Link href="/?component=Input" disabled={state === 'Disabled link'}>
            Forms
          </Sidebar.Link>
          <Sidebar.Link href="/?component=Sidebar" current>
            {state === 'Long labels'
              ? 'Navigation components and website destinations'
              : 'Navigation'}
          </Sidebar.Link>
        </Sidebar.Group>
        <Sidebar.Group label="Resources">
          <Sidebar.Link href="/getting-started/">Getting started</Sidebar.Link>
        </Sidebar.Group>
      </Sidebar>
    );
  return (
    <>
      <Pagination
        page={state === 'Empty' ? 1 : page}
        {...(state === 'Unknown total'
          ? { hasNextPage: page < 3 }
          : { pageCount: state === 'Empty' ? 0 : 12 })}
        disabled={state === 'Disabled'}
        onPageChange={setPage}
        label="Sample result pages"
      />
      <p className="generic-demo-status">
        {state === 'Empty'
          ? 'There are no sample results.'
          : state === 'Unknown total'
            ? `Sample page ${page}; the total is not provided.`
            : `Sample page ${page} of 12.`}
      </p>
    </>
  );
}
