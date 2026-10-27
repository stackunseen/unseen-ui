'use client';
import { useId, useState } from 'react';
import { Button, Card, Numeric, Stat, StatGroup, StatusBadge, Table } from '@stackunseen/ui';
import { TimerIcon } from '@radix-ui/react-icons';
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
    if (state === 'With icon' || state === 'Sections')
      return (
        <Card aria-labelledby={id} style={{ maxWidth: 360 }}>
          <Card.Header
            icon={<TimerIcon />}
            actions={
              state === 'Sections' ? <StatusBadge state="idle" label="October" /> : undefined
            }
          >
            <Card.Title id={id}>Time saved</Card.Title>
            <Card.Description>When tool calls save you time</Card.Description>
          </Card.Header>
          <Card.Content>
            <Numeric size="lg" value="11.4 h" qualifier="+2.1 h vs September" />
          </Card.Content>
          {state === 'Sections' && (
            <>
              <Card.Section>
                <StatGroup aria-label="By tool">
                  <Stat variant="plain" label="Summarize" value="4.7 h" />
                  <Stat variant="plain" label="Rewrite" value="3.3 h" />
                  <Stat variant="plain" label="Translate" value="1.9 h" />
                </StatGroup>
              </Card.Section>
              <Card.Section>
                <Stat variant="plain" label="Weekly goal" value="2.6 of 3 h" note="2 days left" />
              </Card.Section>
            </>
          )}
        </Card>
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
