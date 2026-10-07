'use client';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';
import { safeHttpUrl } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface ChatDestination {
  id: string;
  label: string;
  /** Builds the destination URL for a query. Only http(s) results are rendered. */
  href: (query: string) => string;
}
export interface OpenInChatProps {
  query: string;
  /** Host-chosen destinations. Nothing is opened until the person follows a link. */
  destinations: readonly ChatDestination[];
  label?: string;
  className?: string;
}

/** Opens the current query in another chat product the host lists. */
export function OpenInChat({
  query,
  destinations,
  label = 'Open in chat',
  className = '',
}: OpenInChatProps) {
  const links = destinations
    .map((destination) => ({ ...destination, url: safeHttpUrl(destination.href(query)) }))
    .filter((destination) => destination.url);
  return (
    <Popover>
      <PopoverTrigger className={className} disabled={!links.length} data-part="open-in-chat">
        {label}
      </PopoverTrigger>
      <PopoverContent title={label} description="Links open in a new tab.">
        <ul className={s.links}>
          {links.map((destination) => (
            <li key={destination.id}>
              <a href={destination.url} target="_blank" rel="noreferrer noopener">
                {destination.label}
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
