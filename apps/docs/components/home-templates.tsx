'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { Tabs } from '@stackunseen/ui';
const templates = [
  {
    value: 'workbench',
    label: 'Agent Workbench',
    href: '/patterns/agent-workbench/',
    description:
      'Review accounts, inspect sources and approve a proposed change. A local host supplies the sample states.',
  },
  {
    value: 'coding',
    label: 'Coding Studio',
    href: '/patterns/coding-studio/',
    description:
      'Edit source, compare a diff and apply the reviewed snapshot. The assistant, tests and terminal use sample responses.',
  },
];
export function HomeTemplates() {
  const [value, setValue] = useState('workbench');
  return (
    <section className="home-template-section" aria-labelledby="home-template-title">
      <div className="home-section-heading">
        <div>
          <p className="web-eyebrow">Put the pieces together</p>
          <h2 id="home-template-title">Explore a complete screen.</h2>
        </div>
        <Link prefetch={false} className="web-text-link" href="/templates/">
          All templates <ArrowTopRightIcon width={17} height={17} aria-hidden="true" />
        </Link>
      </div>
      <Tabs
        value={value}
        onValueChange={setValue}
        label="Application template preview"
        items={templates.map((template) => ({
          value: template.value,
          label: template.label,
          content: (
            <figure className="home-template-figure">
              <Link
                prefetch={false}
                href={template.href}
                aria-label={`Open ${template.label} interactive template`}
              >
                <Image
                  className="home-template-light"
                  src={`/previews/${template.value}-light.png`}
                  alt={`${template.label} local application screen in light mode`}
                  width={1376}
                  height={template.value === 'workbench' ? 963 : 787}
                  unoptimized
                />
                <Image
                  className="home-template-dark"
                  src={`/previews/${template.value}-dark.png`}
                  alt={`${template.label} local application screen in dark mode`}
                  width={1376}
                  height={template.value === 'workbench' ? 963 : 787}
                  unoptimized
                />
              </Link>
              <figcaption>
                <p className="home-template-note">
                  Screenshot in the sample theme. Open the live template to try your colors and
                  borders.
                </p>
                <p>{template.description}</p>
                <Link prefetch={false} className="web-text-link" href={template.href}>
                  Open the template <ArrowTopRightIcon width={17} height={17} aria-hidden="true" />
                </Link>
              </figcaption>
            </figure>
          ),
        }))}
      />
    </section>
  );
}
