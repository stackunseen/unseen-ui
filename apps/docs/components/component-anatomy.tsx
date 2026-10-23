import Link from 'next/link';
import type { Anatomy } from '../lib/component-anatomy';
import { componentHref } from '../lib/site-paths';

/**
 * A composed component's parts: a numbered outline of the regions beside a list that names the
 * components drawing each region and the props that change it. The outline is decorative; the
 * list carries everything.
 */
export function ComponentAnatomy({ name, anatomy }: { name: string; anatomy: Anatomy }) {
  return (
    <>
      <p>{anatomy.intro}</p>
      <div className="anatomy">
        <div className="anatomy-figure" aria-hidden="true">
          {anatomy.parts.map((part, index) => (
            <div key={part.name} className="anatomy-region" data-region={part.name.toLowerCase()}>
              <span className="anatomy-number">{index + 1}</span>
              <span>{part.name}</span>
            </div>
          ))}
        </div>
        <ol className="anatomy-parts" aria-label={`Parts of ${name}`}>
          {anatomy.parts.map((part) => (
            <li key={part.name}>
              <h3>{part.name}</h3>
              <p>{part.description}</p>
              {part.builtFrom.length > 0 && (
                <p className="anatomy-meta">
                  <span>Built from</span>
                  {part.builtFrom.map((component, index) => (
                    <span key={component}>
                      <Link prefetch={false} href={componentHref(component)}>
                        {component}
                      </Link>
                      {index < part.builtFrom.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}
              <p className="anatomy-meta">
                <span>Props</span>
                {part.props.map((prop, index) => (
                  <span key={prop}>
                    <code>{prop}</code>
                    {index < part.props.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <h3>Connect it</h3>
      <dl className="anatomy-connection">
        {anatomy.connection.map((way) => (
          <div key={way.label}>
            <dt>{way.label}</dt>
            <dd>
              <p>{way.description}</p>
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
  );
}
