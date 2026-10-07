import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { AccordionItem } from '../accordion/accordion.js';

/** Destinations and content are supplied by the application, never fetched by a block. */
export interface MarketingLink {
  id: string;
  label: string;
  href: string;
}

export interface MarketingHeaderProps extends ComponentPropsWithoutRef<'header'> {
  brand: ReactNode;
  links: readonly MarketingLink[];
  actions?: ReactNode;
  navigationLabel?: string;
  menuLabel?: string;
}

export interface MarketingFooterProps extends ComponentPropsWithoutRef<'footer'> {
  brand: ReactNode;
  description?: ReactNode;
  groups: readonly { id: string; title: string; links: readonly MarketingLink[] }[];
  copyright: ReactNode;
}

export interface MarketingSectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
}

export interface MarketingHeroProps extends MarketingSectionProps {
  /** Use a lower heading level when embedding the hero in a component preview. */
  headingLevel?: 1 | 2 | 3;
  actions?: ReactNode;
  note?: ReactNode;
}

export interface MarketingFeature {
  id: string;
  title: string;
  description: ReactNode;
  icon?: ReactNode;
}

export interface MarketingFeaturesProps extends MarketingSectionProps {
  items: readonly MarketingFeature[];
}

export interface MarketingPlan {
  id: string;
  title: string;
  description: ReactNode;
  /** Display content only. No billing calculation, payment or subscription is performed. */
  price: ReactNode;
  priceNote?: ReactNode;
  features: readonly string[];
  action: ReactNode;
  badge?: ReactNode;
}

export interface MarketingPricingProps extends MarketingSectionProps {
  plans: readonly MarketingPlan[];
  note?: ReactNode;
}

export interface MarketingFAQProps extends MarketingSectionProps {
  items: readonly AccordionItem[];
  value?: string;
  onValueChange?: (value: string) => void;
}

/** The application owns fields, validation, submission, pending state and acknowledgements. */
export interface MarketingContactProps extends Omit<ComponentPropsWithoutRef<'form'>, 'title'> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  feedback?: { tone: 'info' | 'error' | 'success'; message: ReactNode };
}

export interface MarketingArticleProps extends Omit<ComponentPropsWithoutRef<'article'>, 'title'> {
  title: ReactNode;
  /** Use 1 for a page-level article; 2 (the default) inside a page that already has an h1. */
  headingLevel?: 1 | 2 | 3;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Author, date or reading time, shown under the title. */
  byline?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Related links or notes placed beside the body on wide screens and after it on narrow ones. */
  aside?: ReactNode;
}
