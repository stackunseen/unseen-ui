'use client';
import { useState } from 'react';
import {
  Avatar,
  DiffStat,
  ElapsedTime,
  Kbd,
  Numeric,
  Stat,
  StatGroup,
  Tag,
  ToggleGroup,
} from '@stackunseen/ui';
import type { ToggleGroupOption } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';
import { StarIcon } from '@radix-ui/react-icons';

const topics: ToggleGroupOption[] = [
  { value: 'all', label: 'All', count: 24 },
  { value: 'agents', label: 'Agents', count: 9 },
  { value: 'rag', label: 'RAG', count: 7 },
  { value: 'evaluation', label: 'Evaluation', count: 5 },
];

export function WebsiteDisplaySpecimen({ name, state, presentation }: WebsiteSpecimenProps) {
  const [topic, setTopic] = useState<string | null>('all');
  // Started a little before the example mounted, so the running timer shows a real count.
  const [startedAt] = useState(() => Date.now() - 42_000);
  const [topicsSelected, setTopicsSelected] = useState<readonly string[]>(['agents']);
  if (name === 'ToggleGroup') {
    const options = topics.map((option) => ({
      ...option,
      count: state === 'With counts' || state === 'Default' ? option.count : undefined,
      disabled: state === 'Disabled option' && option.value === 'rag',
    }));
    const variant = presentation === 'segmented' ? 'segmented' : 'pills';
    const size = state === 'Small' ? 'sm' : 'default';
    if (state === 'Links')
      return (
        <ToggleGroup
          label="View"
          mode="links"
          variant={variant}
          value="latest"
          options={[
            { value: 'latest', label: 'Latest', href: '/components/toggle-group/' },
            {
              value: 'grouped',
              label: 'By discipline',
              href: '/components/toggle-group/#grouped',
            },
          ]}
        />
      );
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
          <Tag tone="primary" icon={<StarIcon width={12} height={12} aria-hidden="true" />}>
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
  if (name === 'DiffStat')
    return state === 'No changes' ? (
      <DiffStat added={0} removed={0} />
    ) : (
      <DiffStat
        added={15}
        removed={4}
        files={state === 'With files' ? 2 : undefined}
        blocks={state === 'Blocks'}
      />
    );
  if (name === 'ElapsedTime')
    return (
      <span>
        {state === 'Running' ? 'Working · ' : 'Worked for '}
        {state === 'Running' ? (
          <ElapsedTime startedAt={startedAt} />
        ) : state === 'Measured by server' ? (
          <ElapsedTime startedAt={0} durationMs={95_000} />
        ) : (
          <ElapsedTime startedAt="2026-10-21T10:00:00Z" endedAt="2026-10-21T10:02:05Z" />
        )}
      </span>
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
  if (name === 'Kbd')
    return state === 'Combination' ? (
      <p style={{ margin: 0 }}>
        <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>K</Kbd> opens the weekly recap
      </p>
    ) : state === 'Small' ? (
      <p style={{ margin: 0, fontSize: 13 }}>
        <Kbd size="sm">↑</Kbd> <Kbd size="sm">↓</Kbd> to move · <Kbd size="sm">Enter</Kbd> to run
      </p>
    ) : (
      <p style={{ margin: 0 }}>
        Press <Kbd>Enter</Kbd> to send
      </p>
    );
  if (name === 'Numeric')
    return state === 'Headline' ? (
      <Numeric size="lg" value="11.4 h" qualifier="vs September" />
    ) : state === 'Row' ? (
      <div style={{ display: 'grid', gap: 8 }}>
        <Numeric value="1,284" qualifier="runs in October" />
        <Numeric value="32 s" qualifier="per run" />
      </div>
    ) : state === 'Trend' ? (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Numeric size="sm" tone="up" value="+2.1 h" qualifier="saved" />
        <Numeric size="sm" tone="down" value="−4%" qualifier="churn" />
        <Numeric size="sm" tone="primary" value="+18%" qualifier="chords run" />
      </div>
    ) : (
      <p style={{ margin: 0 }}>
        Searched accounts <Numeric size="sm" value="820 ms" />
      </p>
    );
  if (name === 'Stat') {
    const variant =
      presentation === 'plain' ? 'plain' : presentation === 'inset' ? 'inset' : 'card';
    return state === 'Group' || state === 'Default' ? (
      <StatGroup aria-label="Usage">
        <Stat
          variant={variant}
          label="Active users"
          value="1,204"
          delta="+12%"
          trend="up"
          note="Last 30 days"
        />
        <Stat variant={variant} label="Errors" value="3" delta="-2" trend="down" />
        <Stat variant={variant} label="Regions" value="5" />
        <Stat variant={variant} label="Uptime" value="99.98%" />
      </StatGroup>
    ) : (
      <Stat
        variant={variant}
        label="Active users"
        value="1,204"
        delta="+12%"
        trend="up"
        note="Last 30 days"
      />
    );
  }
  return null;
}
