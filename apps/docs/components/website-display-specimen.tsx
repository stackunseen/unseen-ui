'use client';
import { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import {
  Avatar,
  Button,
  LinkButton,
  LinkCard,
  Stat,
  StatGroup,
  Tag,
  ToggleGroup,
} from '@stackunseen/ui';
import type { ToggleGroupOption } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

const topics: ToggleGroupOption[] = [
  { value: 'all', label: 'All', count: 24 },
  { value: 'agents', label: 'Agents', count: 9 },
  { value: 'rag', label: 'RAG', count: 7 },
  { value: 'evaluation', label: 'Evaluation', count: 5 },
];

export function WebsiteDisplaySpecimen({ name, state, presentation }: WebsiteSpecimenProps) {
  const [topic, setTopic] = useState<string | null>('all');
  const [topicsSelected, setTopicsSelected] = useState<readonly string[]>(['agents']);
  if (name === 'LinkButton')
    return (
      <div className="generic-demo-actions" style={{ justifyContent: 'flex-start', margin: 0 }}>
        <LinkButton
          href="/getting-started/"
          variant={state === 'Outline' ? 'outline' : 'primary'}
          size={state === 'Small' ? 'sm' : 'default'}
          target={state === 'External' ? '_blank' : undefined}
          rel={state === 'External' ? 'noreferrer' : undefined}
        >
          {state === 'External' ? 'Open the npm package' : 'Get started'}
        </LinkButton>
        <Button asChild variant="ghost" size={state === 'Small' ? 'sm' : 'default'}>
          <a href="/components/">Browse components</a>
        </Button>
      </div>
    );
  if (name === 'ToggleGroup') {
    const options = topics.map((option) => ({
      ...option,
      count: state === 'With counts' || state === 'Default' ? option.count : undefined,
      disabled: state === 'Disabled option' && option.value === 'rag',
    }));
    const variant = presentation === 'segmented' ? 'segmented' : 'pills';
    const size = state === 'Small' ? 'sm' : 'default';
    return state === 'Multiple' ? (
      <ToggleGroup
        type="multiple"
        label="Topics"
        options={options}
        value={topicsSelected}
        onValueChange={setTopicsSelected}
        variant={variant}
        size={size}
      />
    ) : (
      <ToggleGroup
        label="Topics"
        options={options}
        value={topic}
        onValueChange={setTopic}
        variant={variant}
        size={size}
        allowEmpty
      />
    );
  }
  if (name === 'Tag')
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {state === 'Tones' ? (
          <>
            <Tag>Recommended</Tag>
            <Tag tone="primary">Deep dive</Tag>
            <Tag tone="accent">Advanced</Tag>
            <Tag tone="success">Stable</Tag>
            <Tag tone="warning">Draft</Tag>
          </>
        ) : state === 'With icon' ? (
          <Tag tone="primary" icon={<Sparkles size={12} />}>
            New in alpha.3
          </Tag>
        ) : state === 'Custom hue' ? (
          <>
            <Tag hue="#b45309">Evaluation</Tag>
            <Tag hue="hsl(200 70% 45%)">Retrieval</Tag>
          </>
        ) : state === 'Mono' ? (
          <Tag mono>v0.1.0-alpha.3</Tag>
        ) : (
          <>
            <Tag size={state === 'Small' ? 'sm' : 'default'}>Recommended</Tag>
            <Tag size={state === 'Small' ? 'sm' : 'default'} tone="accent">
              Advanced
            </Tag>
          </>
        )}
      </div>
    );
  if (name === 'Avatar')
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {state === 'Sizes' ? (
          <>
            <Avatar name="Ada Lovelace" size="sm" />
            <Avatar name="Ada Lovelace" />
            <Avatar name="Ada Lovelace" size="lg" />
          </>
        ) : state === 'No name' ? (
          <>
            <Avatar />
            <span>Decorative, beside visible text</span>
          </>
        ) : state === 'With image' ? (
          <Avatar name="Sample team" src="/icon.svg" size="lg" />
        ) : state === 'Image failed' ? (
          <Avatar name="Sam Rivera" src="/previews/missing-avatar.png" size="lg" />
        ) : (
          <>
            <Avatar name="Sam Rivera" />
            <span>Sam Rivera</span>
          </>
        )}
      </div>
    );
  if (name === 'Stat')
    return state === 'Group' || state === 'Default' ? (
      <StatGroup aria-label="Usage">
        <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />
        <Stat label="Errors" value="3" delta="-2" trend="down" />
        <Stat label="Regions" value="5" />
        <Stat label="Uptime" value="99.98%" />
      </StatGroup>
    ) : (
      <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />
    );
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 440 }}>
      <LinkCard
        href={state === 'External' ? 'https://www.npmjs.com/package/@stackunseen/ui' : '/docs/'}
        title={state === 'External' ? '@stackunseen/ui on npm' : 'Documentation'}
        description={
          state === 'External'
            ? 'Package page with versions and install instructions.'
            : 'Setup, theming and state guides.'
        }
        meta={state === 'External' ? 'npmjs.com' : '4 guides'}
        icon={state === 'With icon' || state === 'External' ? <BookOpen size={18} /> : undefined}
        external={state === 'External'}
        variant={presentation === 'row' || state === 'Row' ? 'row' : 'card'}
      />
    </div>
  );
}
