'use client';
import { useId, useState } from 'react';
import { Button, Card, Field, Input, Textarea } from '@stackunseen/ui';
import {
  MarketingArticle,
  MarketingContact,
  MarketingFAQ,
  MarketingFeatures,
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
  MarketingPricing,
} from '@stackunseen/ui/marketing';
import '@stackunseen/ui/marketing.css';
import s from './optional-specimen.module.css';

const navigation = [
  { id: 'template', label: 'Full template', href: '/templates/marketing/' },
  { id: 'blocks', label: 'Browse blocks', href: '/components/#ui' },
];

export function MarketingSpecimen({ name, state = 'Default' }: { name: string; state?: string }) {
  const id = useId();
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const brand = <a href="/templates/marketing/">Folio sample</a>;
  let content;
  if (name === 'MarketingHeader')
    content = (
      <MarketingHeader
        brand={brand}
        links={navigation}
        navigationLabel="Sample website"
        actions={<a href="/templates/marketing/#folio-contact">Contact example</a>}
      />
    );
  else if (name === 'MarketingFooter')
    content = (
      <MarketingFooter
        brand={brand}
        description="A fictional product website built with the library."
        groups={[{ id: 'explore', title: 'Explore', links: navigation }]}
        copyright="Sample footer · replace with your own legal text"
      />
    );
  else if (name === 'MarketingHero')
    content = (
      <MarketingHero
        headingLevel={2}
        title="A shared home for your work."
        description="A fictional product introduction with a real component preview."
        actions={<a href="/templates/marketing/">Explore the template</a>}
        note="Local example. No account or service is connected."
      >
        <Card>
          <Card.Title as="h3">This week's focus</Card.Title>
          <p>Project notes, team decisions and a clear next step.</p>
        </Card>
      </MarketingHero>
    );
  else if (name === 'MarketingFeatures')
    content = (
      <MarketingFeatures
        title="The workspace"
        items={[
          {
            id: 'notes',
            title: 'Project notes',
            description: 'Keep the useful context close to the work.',
          },
          {
            id: 'decisions',
            title: 'Shared decisions',
            description: 'Record what your team agreed to do next.',
          },
        ]}
      />
    );
  else if (name === 'MarketingPricing')
    content = (
      <MarketingPricing
        title="Sample plans"
        description="Display-only terms for this fictional product."
        plans={[
          {
            id: 'sample',
            title: 'Small team',
            description: 'Example content for a plan card.',
            price: '£12',
            priceNote: 'Sample monthly price',
            features: ['Shared project notes', 'Team decisions'],
            action: (
              <Button
                onClick={() =>
                  setNotice('Selected the sample plan. No subscription or payment was created.')
                }
              >
                Select sample plan
              </Button>
            ),
          },
        ]}
        note="Replace prices, limits and payment actions with your real terms."
      />
    );
  else if (name === 'MarketingFAQ')
    content = (
      <MarketingFAQ
        title="Questions"
        value={question}
        onValueChange={setQuestion}
        items={[
          {
            value: 'local',
            title: 'Is this a working service?',
            content:
              'This is a local component example. It does not create accounts or send requests.',
          },
          {
            value: 'theme',
            title: 'Can I change the theme?',
            content:
              'Yes. The blocks inherit the shared theme and accept className and style for scoped customization.',
          },
        ]}
      />
    );
  else if (name === 'MarketingContact')
    content = (
      <MarketingContact
        title="Contact example"
        description="Try browser validation and local feedback."
        onSubmit={(event) => {
          event.preventDefault();
          setNotice('Saved the contact draft in this page. Nothing was sent.');
        }}
        actions={
          <Button type="submit" form={`contact-${id}`}>
            Save local draft
          </Button>
        }
        id={`contact-${id}`}
        feedback={notice ? { tone: 'info', message: notice } : undefined}
      >
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              setNotice('');
            }}
            autoComplete="email"
          />
        </Field>
        <Field label="Message">
          <Textarea
            required
            value={message}
            onChange={(event) => {
              setMessage(event.currentTarget.value);
              setNotice('');
            }}
          />
        </Field>
      </MarketingContact>
    );
  else
    content = (
      <MarketingArticle
        title="Working together"
        headingLevel={state === 'Page level with aside' ? (1 as const) : (2 as const)}
        byline={state === 'Page level with aside' ? 'By Sam Rivera · 6 min read' : undefined}
        meta={<span>Sample article · 5 October 2026</span>}
        description="Keep decisions where the work happens."
        aside={
          state === 'Page level with aside' ? (
            <>
              <strong>Related</strong>
              <a href="/templates/marketing/#folio-journal">Sample journal</a>
              <a href="/components/marketing-hero/">MarketingHero</a>
            </>
          ) : undefined
        }
      >
        <p>
          Write down the next step, who owns it and the context they need. A short note is easier to
          use when it sits beside the project.
        </p>
        <a href="/templates/marketing/#folio-journal">Read the sample journal</a>
      </MarketingArticle>
    );
  return (
    <div className={s.marketing}>
      {content}
      {name !== 'MarketingContact' && (
        <p role="status" className="generic-demo-status">
          {notice}
        </p>
      )}
    </div>
  );
}
