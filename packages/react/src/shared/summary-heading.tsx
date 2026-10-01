import type { ReactNode } from 'react';
import s from './summary-heading.module.css';

/** Keep the icon and readable title together when a trailing status wraps. */
export function SummaryHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={s.heading} data-part="summary-heading">
      {icon}
      <strong className={s.title}>{children}</strong>
    </div>
  );
}
