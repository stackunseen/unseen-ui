'use client';
import { useState } from 'react';

interface Prop {
  name: string;
  required?: boolean;
  type: string;
  description?: string;
}
interface Props {
  name: string;
  props: Prop[];
  inherits: string[];
}

/**
 * Every prop the component declares, from the package manifest. Closed by default so the page
 * leads with the example's main inputs; opening it loads the list.
 */
export function PropsTable({ slug }: { slug: string }) {
  const [data, setData] = useState<Props>();
  const [failed, setFailed] = useState(false);
  return (
    <details
      className="props-table"
      onToggle={(event) => {
        if (!(event.currentTarget as HTMLDetailsElement).open || data) return;
        fetch(`/props/${slug}.json`)
          .then((response) => (response.ok ? response.json() : Promise.reject()))
          .then((value: Props) => setData(value))
          .catch(() => setFailed(true));
      }}
    >
      <summary>All props{data ? ` (${data.props.length})` : ''}</summary>
      {failed ? (
        <p>The prop list could not load. The package&apos;s TypeScript declarations have it.</p>
      ) : !data ? (
        <p>Loading…</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">What it does</th>
              </tr>
            </thead>
            <tbody>
              {[...data.props]
                // Required props first: they are what a first use needs.
                .sort((a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)))
                .map((prop) => (
                  <tr key={prop.name}>
                    <th scope="row">
                      <code>{prop.name}</code>
                      {prop.required && <span className="props-required">required</span>}
                    </th>
                    <td>
                      <code>{prop.type}</code>
                    </td>
                    <td>{prop.description ?? ''}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {data.inherits.length > 0 && <p>Also accepts {data.inherits.join(' and ')}.</p>}
        </>
      )}
    </details>
  );
}
