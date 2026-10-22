'use client';
import { useId } from 'react';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './mcp-tool-list.module.css';

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  availability: 'allowed' | 'denied' | 'unknown';
  schemaSummary?: string;
}

export function MCPToolList({
  variant = 'list',
  tools,
  query,
  onQueryChange,
}: VariantProps<'MCPToolList'> & {
  tools: MCPTool[];
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const id = useId();
  const filtered = tools.filter((tool) =>
    `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={own.mcpTools} data-variant={variant}>
      <label htmlFor={id} className={s.field + ' ' + own.field}>
        Filter tools
        <input
          id={id}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          type="search"
        />
      </label>
      {variant === 'accordion' ? (
        <>
          <Accordion
            type="multiple"
            region={false}
            items={filtered.map((tool) => ({
              value: tool.id,
              title: (
                <span className={s.row}>
                  <span>{tool.name}</span>
                  <span className={s.muted}>{tool.availability}</span>
                </span>
              ),
              content: (
                <>
                  <p>{tool.description}</p>
                  <code>{tool.schemaSummary ?? 'Schema unavailable'}</code>
                </>
              ),
            }))}
          />
          {!filtered.length && <p className={s.muted}>No matching tools.</p>}
        </>
      ) : (
        <ul className={s.list + ' ' + own.list}>
          {filtered.map((tool) => (
            <li key={tool.id} className={s.item + ' ' + own.item}>
              <div>
                <strong>{tool.name}</strong>
                <p className={s.muted}>{tool.description}</p>
                <small>
                  {tool.availability} · {tool.schemaSummary ?? 'Schema unavailable'}
                </small>
              </div>
            </li>
          ))}
          {!filtered.length && <li className={s.muted}>No matching tools.</li>}
        </ul>
      )}
    </div>
  );
}
