'use client';
import { useState } from 'react';
import { AITheme, Button, Field, Input } from '@stackunseen/ui';
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

const links = [{ id: 'local', label: 'Local example', href: '#public-marketing' }];

export function MarketingPublicExample() {
  const [question, setQuestion] = useState('');
  return (
    <AITheme appearance="dark" config={{ primary: '#7c3aed' }}>
      <div id="public-marketing">
        <MarketingHeader brand="Sample brand" links={links} />
        <MarketingHero
          headingLevel={2}
          title="Public website example"
          description="Supplied product content."
          actions={<Button>Sample action</Button>}
        />
        <MarketingFeatures
          title="Features"
          items={[{ id: 'notes', title: 'Notes', description: 'Sample content.' }]}
        />
        <MarketingPricing
          title="Sample plan"
          plans={[
            {
              id: 'sample',
              title: 'Sample',
              description: 'Display only.',
              price: '£12',
              features: ['Sample feature'],
              action: <Button>Sample plan</Button>,
            },
          ]}
        />
        <MarketingFAQ
          title="Questions"
          value={question}
          onValueChange={setQuestion}
          items={[
            { value: 'local', title: 'Is this local?', content: 'Yes, this example is local.' },
          ]}
        />
        <MarketingContact
          title="Contact example"
          onSubmit={(event) => event.preventDefault()}
          actions={<Button type="submit">Validate locally</Button>}
        >
          <Field label="Contact email">
            <Input type="email" required />
          </Field>
        </MarketingContact>
        <MarketingArticle title="Sample article" meta="Supplied metadata">
          <p>Safe React content.</p>
        </MarketingArticle>
        <MarketingFooter
          brand="Sample brand"
          groups={[{ id: 'links', title: 'Explore', links }]}
          copyright="Supplied legal text"
        />
      </div>
    </AITheme>
  );
}
