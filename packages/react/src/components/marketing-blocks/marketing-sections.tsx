'use client';
import { useId } from 'react';
import { Accordion } from '../accordion/accordion.js';
import type {
  MarketingArticleProps,
  MarketingFAQProps,
  MarketingFeaturesProps,
  MarketingHeroProps,
} from './types.js';

export function MarketingHero({
  title,
  headingLevel = 1,
  eyebrow,
  description,
  actions,
  note,
  children,
  className = '',
  ...props
}: MarketingHeroProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <section
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-hero ${className}`}
    >
      <div className="uim-hero-copy">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <Heading id={titleId}>{title}</Heading>
        {description && <div className="uim-description">{description}</div>}
        {actions && <div className="uim-actions">{actions}</div>}
        {note && <div className="uim-note">{note}</div>}
      </div>
      {children && <div className="uim-hero-visual">{children}</div>}
    </section>
  );
}

export function MarketingFeatures({
  title,
  eyebrow,
  description,
  items,
  children,
  className = '',
  ...props
}: MarketingFeaturesProps) {
  const titleId = useId();
  return (
    <section
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-section uim-features ${className}`}
    >
      <div className="uim-section-heading">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && <div className="uim-description">{description}</div>}
        {children}
      </div>
      <div className="uim-feature-list">
        {items.map((item) => (
          <div className="uim-feature" key={item.id}>
            {item.icon && (
              <span className="uim-feature-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <div>
              <h3>{item.title}</h3>
              <div className="uim-description">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MarketingFAQ({
  title,
  eyebrow,
  description,
  items,
  value,
  onValueChange,
  children,
  className = '',
  ...props
}: MarketingFAQProps) {
  const titleId = useId();
  return (
    <section
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-section uim-faq ${className}`}
    >
      <div className="uim-section-heading">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && <div className="uim-description">{description}</div>}
        {children}
      </div>
      <Accordion
        className="uim-faq-items"
        type="single"
        collapsible
        region={false}
        headingLevel={3}
        items={items}
        value={value}
        onValueChange={onValueChange}
      />
    </section>
  );
}

export function MarketingArticle({
  title,
  headingLevel = 2,
  eyebrow,
  description,
  byline,
  meta,
  actions,
  aside,
  children,
  className = '',
  ...props
}: MarketingArticleProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <article
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-section uim-article ${className}`}
    >
      <header className="uim-section-heading">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <Heading id={titleId}>{title}</Heading>
        {byline && <p className="uim-byline">{byline}</p>}
        {description && <div className="uim-description">{description}</div>}
        {meta && <div className="uim-note">{meta}</div>}
        {actions && <div className="uim-actions">{actions}</div>}
      </header>
      <div className="uim-article-body" data-aside={aside ? 'true' : undefined}>
        <div className="uim-article-content">{children}</div>
        {aside && <aside className="uim-article-aside">{aside}</aside>}
      </div>
    </article>
  );
}
