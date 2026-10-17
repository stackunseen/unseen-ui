'use client';
import { useId, useState } from 'react';
import { Button, Card, StatusBadge, Table } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteSurfaceSpecimen({ name, state }: WebsiteSpecimenProps) {
  const id = useId();
  const [notice, setNotice] = useState('');
  if (name === 'Card') {
    if (state === 'Link' || state === 'External link')
      return (
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <Card
            href={
              state === 'External link' ? 'https://www.npmjs.com/package/@stackunseen/ui' : '/docs/'
            }
            external={state === 'External link'}
          >
            <Card.Title>
              {state === 'External link' ? '@stackunseen/ui on npm' : 'Documentation'}
            </Card.Title>
            <Card.Description>
              {state === 'External link'
                ? 'Versions, install command and package files.'
                : 'Install, connect values and callbacks, and theme the components.'}
            </Card.Description>
          </Card>
        </div>
      );
    return (
      <Card aria-labelledby={id}>
        <Card.Header
          actions={
            state === 'Header actions' ? (
              <>
                <StatusBadge state="idle" label="Draft" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotice('Edit requested for the sample project.')}
                >
                  Edit project
                </Button>
              </>
            ) : undefined
          }
        >
          <Card.Title id={id}>Component library</Card.Title>
          <Card.Description>Reusable website and AI controls.</Card.Description>
        </Card.Header>
        <Card.Content>
          <p>
            Explore focused examples, controlled interactions and documented application
            responsibilities.
          </p>
          {state === 'Long content' && (
            <p>
              {'Choose components that make the content clear and the task understandable. '.repeat(
                15,
              )}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
        </Card.Content>
        {state === 'With action' && (
          <Card.Footer>
            <Button
              variant="outline"
              onClick={() => setNotice('The local sample project is selected.')}
            >
              Select sample project
            </Button>
          </Card.Footer>
        )}
      </Card>
    );
  }
  const wide = state === 'Wide content';
  return (
    <Table label="Sample package status" style={wide ? { minWidth: 720 } : undefined}>
      <Table.Caption>Illustrative package data; availability is not a release claim.</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>Package</Table.Head>
          <Table.Head>Status</Table.Head>
          {wide && (
            <>
              <Table.Head>Purpose</Table.Head>
              <Table.Head>Owner</Table.Head>
            </>
          )}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {state === 'Empty' ? (
          <Table.Row>
            <Table.Cell colSpan={wide ? 4 : 2}>No sample packages found.</Table.Cell>
          </Table.Row>
        ) : (
          ['Components', 'Core', 'Documentation'].map((label) => (
            <Table.Row key={label}>
              <Table.Head scope="row">{label}</Table.Head>
              <Table.Cell>Experimental alpha</Table.Cell>
              {wide && (
                <>
                  <Table.Cell>
                    Reusable interfaces for project websites and application workflows.
                  </Table.Cell>
                  <Table.Cell>Local sample maintainer</Table.Cell>
                </>
              )}
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table>
  );
}
