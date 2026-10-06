'use client';
import { useId } from 'react';
import type { MarketingContactProps } from './types.js';

export function MarketingContact({
  title,
  eyebrow,
  description,
  aside,
  actions,
  feedback,
  children,
  className = '',
  ...props
}: MarketingContactProps) {
  const titleId = useId();
  return (
    <form
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      className={`uim-section uim-contact ${className}`}
    >
      <div className="uim-section-heading">
        {eyebrow && <p className="uim-eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && <div className="uim-description">{description}</div>}
        {aside && <div className="uim-contact-aside">{aside}</div>}
      </div>
      <div className="uim-contact-fields">
        {children}
        {feedback && (
          <div
            className="uim-feedback"
            data-tone={feedback.tone}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </div>
        )}
        {actions && <div className="uim-actions">{actions}</div>}
      </div>
    </form>
  );
}
