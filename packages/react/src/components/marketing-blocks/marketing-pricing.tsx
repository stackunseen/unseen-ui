'use client';
import { useId } from 'react';
import { Card } from '../card/card.js';
import type { MarketingPricingProps } from './types.js';

export function MarketingPricing({
  title,
  eyebrow,
  description,
  plans,
  note,
  children,
  className = '',
  ...props
}: MarketingPricingProps) {
  const titleId = useId();
  return (
    <section
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-section uim-pricing ${className}`}
    >
      <div className="uim-section-heading">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && <div className="uim-description">{description}</div>}
        {children}
      </div>
      <div className="uim-plans">
        {plans.map((plan) => (
          <Card className="uim-plan" key={plan.id} data-featured={Boolean(plan.badge)}>
            <Card.Header>
              <div className="uim-plan-name">
                <Card.Title as="h3">{plan.title}</Card.Title>
                {plan.badge && <span className="uim-plan-badge">{plan.badge}</span>}
              </div>
              <Card.Description>{plan.description}</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="uim-price">{plan.price}</div>
              {plan.priceNote && <p className="uim-note">{plan.priceNote}</p>}
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </Card.Content>
            <Card.Footer>{plan.action}</Card.Footer>
          </Card>
        ))}
      </div>
      {note && <div className="uim-note uim-pricing-note">{note}</div>}
    </section>
  );
}
