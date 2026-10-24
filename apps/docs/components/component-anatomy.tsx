import Link from 'next/link';
import type { CSSProperties } from 'react';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';
import type { Anatomy } from '../lib/component-anatomy';
import { componentHref } from '../lib/site-paths';
import { InlineCode } from './inline-code';

/**
 * A compound component's parts. Regions get a numbered schematic of the layout beside the list;
 * sub-components get an example of how they nest. The schematic is decorative; the list and the
 * example carry everything.
 */
export function ComponentAnatomy({ name, anatomy }: { name: string; anatomy: Anatomy }) {
  const figure = anatomy.kind === 'regions' ? anatomy.figure : undefined;
  return (
    <>
      <p>
        <InlineCode text={anatomy.intro} />
      </p>
      {anatomy.example && (
        <div className="anatomy-example">
          <h3>How the parts fit together</h3>
          <HighlightedCodeBlock code={anatomy.example} language="tsx" />
        </div>
      )}
      <div className="anatomy" data-figure={figure ? '' : undefined}>
        {figure && (
          <div
            className="anatomy-figure"
            aria-hidden="true"
            style={
              {
                gridTemplateColumns: figure.columns,
                gridTemplateRows: figure.rows,
                gridTemplateAreas: figure.areas.map((row) => `"${row}"`).join(' '),
              } as CSSProperties
            }
          >
            {anatomy.parts.map((part, index) => (
              <div key={part.name} className="anatomy-region" style={{ gridArea: part.area }}>
                <span className="anatomy-number">{index + 1}</span>
                <span className="anatomy-region-name">{part.name}</span>
              </div>
            ))}
          </div>
        )}
        <ol className="anatomy-parts" aria-label={`Parts of ${name}`}>
          {anatomy.parts.map((part) => (
            <li key={part.name}>
              <h3>{part.render ? <code>{part.render}</code> : part.name}</h3>
              <p>
                <InlineCode text={part.description} />
              </p>
              {part.builtFrom && part.builtFrom.length > 0 && (
                <p className="anatomy-meta">
                  <span>Built from</span>
                  {part.builtFrom.map((component, index) => (
                    <span key={component}>
                      <Link prefetch={false} href={componentHref(component)}>
                        {component}
                      </Link>
                      {index < part.builtFrom!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}
              {part.props && part.props.length > 0 && (
                <p className="anatomy-meta">
                  <span>Props</span>
                  {part.props.map((prop, index) => (
                    <span key={prop}>
                      <code>{prop}</code>
                      {index < part.props!.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
      {anatomy.connection && (
        <>
          <h3>Connect it</h3>
          <dl className="anatomy-connection">
            {anatomy.connection.map((way) => (
              <div key={way.label}>
                <dt>{way.label}</dt>
                <dd>
                  <p>
                    <InlineCode text={way.description} />
                  </p>
                  <p className="anatomy-meta">
                    {way.props.map((prop) => (
                      <code key={prop}>{prop}</code>
                    ))}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </>
  );
}
