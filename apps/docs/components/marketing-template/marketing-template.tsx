'use client';
import { useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowTopRightIcon,
  LayersIcon,
  ReaderIcon,
  StackIcon,
  TargetIcon,
} from '@radix-ui/react-icons';
import {
  MarketingArticle,
  MarketingFAQ,
  MarketingFeatures,
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
} from '@stackunseen/ui/marketing';
import { ContactDemo } from './contact-demo';
import { ProjectPreview } from './project-preview';
import { PricingDemo } from './pricing-demo';
import s from './marketing-template.module.css';

const navigation = [
  { id: 'features', label: 'The workspace', href: '#folio-features' },
  { id: 'pricing', label: 'Plans', href: '#folio-pricing' },
  { id: 'journal', label: 'Journal', href: '#folio-journal' },
];

function Brand() {
  return (
    <a href="#folio-top" aria-label="Folio home">
      <LayersIcon width={30} height={30} aria-hidden="true" /> folio
    </a>
  );
}

export function MarketingTemplate() {
  const [faq, setFAQ] = useState('');
  return (
    <div className={s.template} id="folio-top">
      <div className={s.templateBar}>
        <a href="/patterns/">
          <ArrowLeftIcon width={15} height={15} aria-hidden="true" /> All patterns
        </a>
        <span>Fictional product · interactive local example</span>
      </div>
      <MarketingHeader
        brand={<Brand />}
        links={navigation}
        navigationLabel="Folio navigation"
        actions={
          <a href="#folio-contact" className={s.darkLink}>
            Let's talk <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
          </a>
        }
      />
      <MarketingHero
        eyebrow="A SHARED HOME FOR YOUR WORK"
        title="Bring your team's work into focus."
        description="Project notes, shared decisions and the next useful step. Folio brings them together so small teams can spend more time making good work."
        actions={
          <>
            <a href="#folio-pricing" className={s.darkLink}>
              Find your plan <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
            </a>
            <a href="#folio-features" className={s.textLink}>
              Explore the workspace
            </a>
          </>
        }
        note="Sample product and content, built with Unseen UI."
      >
        <ProjectPreview />
      </MarketingHero>
      <div className={s.intentStrip}>
        <span>MADE FOR THE WAY SMALL TEAMS WORK</span>
        <p>Independent studios.</p>
        <p>Thoughtful teams.</p>
        <p>Work in progress.</p>
      </div>
      <MarketingFeatures
        id="folio-features"
        eyebrow="LESS SEARCHING. MORE MAKING."
        title="Keep the context close."
        description="From the first rough thought to the decision that moves a project forward. A workspace with room for both."
        items={[
          {
            id: 'notes',
            title: 'One place for the useful details',
            description:
              'Keep project briefs and working notes together, with a clear path back to the original context.',
            icon: <StackIcon width={15} height={15} />,
          },
          {
            id: 'decisions',
            title: 'Decisions you can return to',
            description:
              'Write down what changed, why it changed and what happens next. Help the next person pick up the thread.',
            icon: <ReaderIcon width={15} height={15} />,
          },
          {
            id: 'focus',
            title: 'A little more room to focus',
            description:
              'Give each project a simple home. Keep the next step visible without turning every note into another notification.',
            icon: <TargetIcon width={15} height={15} />,
          },
        ]}
      />
      <PricingDemo />
      <MarketingArticle
        id="folio-journal"
        eyebrow="FROM THE JOURNAL"
        title="Leave a useful trail."
        description="A short note on writing things down for the next person, including your future self."
        meta="Sample editorial · 2 minute read"
        actions={
          <a href="#folio-contact" className={s.textLink}>
            Talk about your workflow <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
          </a>
        }
      >
        <div className={s.journalCover} aria-hidden="true">
          <span>
            THE WORKING
            <br />
            NOTE
          </span>
          <span>01 / FOLIO JOURNAL</span>
        </div>
        <h3>Start with the decision</h3>
        <p>
          Useful notes do not need to capture every minute of a meeting. Start with what the team
          decided and the problem that decision was meant to solve.
        </p>
        <h3>Keep enough context</h3>
        <p>
          Link the brief, name the open question and write down the next step. A short trail is
          easier to return to than a perfect document nobody has time to maintain.
        </p>
      </MarketingArticle>
      <MarketingFAQ
        id="folio-faq"
        eyebrow="A FEW GOOD QUESTIONS"
        title="Before you get started."
        description="About the example, its content and how you can adapt it."
        value={faq}
        onValueChange={setFAQ}
        items={[
          {
            value: 'real',
            title: 'Is Folio a real service?',
            content:
              'Folio is a fictional product used to demonstrate this marketing template. Projects, plans and editorial content are illustrative. There are no customer reviews or live service claims.',
          },
          {
            value: 'blocks',
            title: 'Can I use the sections separately?',
            content:
              'Yes. Header, footer, hero, features, pricing, FAQ, contact and article are reusable React blocks. Supply your content, links and actions, and import the optional marketing stylesheet.',
          },
          {
            value: 'contact',
            title: 'Where does the contact form send my message?',
            content:
              'It prepares a local draft only. Nothing is transmitted or saved. Your application must provide its own validation, submission handler and truthful delivery feedback.',
          },
          {
            value: 'theme',
            title: 'Does it use the same theme as the components?',
            content:
              'The blocks inherit Unseen UI theme tokens for colors, controls and corners. Change appearance in the site header to see the template in light and dark modes.',
          },
        ]}
      />
      <ContactDemo />
      <MarketingFooter
        brand={<Brand />}
        description="A little less scattered. A little more together."
        groups={[
          { id: 'workspace', title: 'Workspace', links: navigation },
          {
            id: 'learn',
            title: 'Explore',
            links: [
              { id: 'faq', label: 'Questions', href: '#folio-faq' },
              { id: 'contact', label: 'Contact preview', href: '#folio-contact' },
              { id: 'components', label: 'Unseen UI components', href: '/components/' },
            ],
          },
        ]}
        copyright="Folio is a fictional product. All content is illustrative."
      >
        <a href="/docs/">
          Built with Unseen UI <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
        </a>
      </MarketingFooter>
    </div>
  );
}
