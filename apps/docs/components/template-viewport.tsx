'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';

const devices = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: undefined },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 820 },
  { id: 'phone', label: 'Phone', icon: Smartphone, width: 390 },
] as const;
type Device = (typeof devices)[number]['id'];

/**
 * A template page's top bar: the way back, and a switch that shows the same page at tablet or
 * phone width. Those widths load the page in a frame (with ?frame=1, which hides the site
 * chrome before first paint), so the template's own breakpoints apply as on a real device.
 */
export function TemplateViewport({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const path = usePathname();
  const active = devices.find((item) => item.id === device)!;
  return (
    <>
      <div className="template-viewport-bar">
        <a className="web-text-link template-workspace-back" href={backHref}>
          {backLabel}
        </a>
        <div className="template-viewport-tools">
          <div className="template-viewport-switch" role="radiogroup" aria-label="Preview width">
            {devices.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={device === id}
                onClick={() => setDevice(id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <a
            className="template-viewport-open"
            href={`${path}?frame=1`}
            target="_blank"
            rel="noopener"
            aria-label="Open the template on its own in a new tab"
            title="Open in a new tab"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      {active.width ? (
        <div className="template-device">
          <iframe
            key={active.id}
            title={`${active.label} preview`}
            src={`${path}?frame=1`}
            style={{ width: active.width }}
          />
          <p>
            {active.label}, {active.width}px wide
          </p>
        </div>
      ) : (
        children
      )}
    </>
  );
}
