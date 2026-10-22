import s from '../../shared/styles/devtools.module.css';

export interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  children?: readonly SchemaField[];
}
export interface SchemaParameter extends SchemaField {
  in: 'path' | 'query' | 'header' | 'cookie';
}
export interface SchemaDisplayProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: string;
  description?: string;
  parameters?: readonly SchemaParameter[];
  requestBody?: readonly SchemaField[];
  responseBody?: readonly SchemaField[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const MAX_DEPTH = 6;

function Fields({ fields, depth = 0 }: { fields: readonly SchemaField[]; depth?: number }) {
  return (
    <ul className={s.tree}>
      {fields.map((field) => (
        <li key={field.name}>
          <span className={s.mono}>{field.name}</span>{' '}
          <span className={`${s.meta} ${s.mono}`}>{field.type}</span>
          {field.required && <span className={`${s.error} ${s.meta}`}> required</span>}
          {field.description && <div className={s.meta}>{field.description}</div>}
          {!!field.children?.length &&
            (depth < MAX_DEPTH ? (
              <Fields fields={field.children} depth={depth + 1} />
            ) : (
              <div className={s.meta}>Nested fields omitted.</div>
            ))}
        </li>
      ))}
    </ul>
  );
}

/** Read-only view of an API operation's parameters and bodies. */
export function SchemaDisplay({
  method,
  path,
  description,
  parameters = [],
  requestBody = [],
  responseBody = [],
  headingLevel = 3,
  className = '',
}: SchemaDisplayProps) {
  const Heading = `h${headingLevel}` as const;
  const Section = `h${Math.min(6, headingLevel + 1)}` as 'h3' | 'h4' | 'h5' | 'h6';
  const sections = [
    ['Parameters', parameters],
    ['Request body', requestBody],
    ['Response', responseBody],
  ] as const;
  return (
    <section className={`${s.root} ${className}`} data-part="schema-display">
      <div className={s.header}>
        <Heading className={s.title}>
          <span className={s.method}>{method}</span>
          <span className={s.mono}>{path}</span>
        </Heading>
      </div>
      {description && <p className={`${s.body} ${s.meta}`}>{description}</p>}
      {sections
        .filter(([, fields]) => fields.length > 0)
        .map(([label, fields]) => (
          <div key={label} className={s.body}>
            <Section className={s.meta}>{label}</Section>
            <Fields fields={fields} />
          </div>
        ))}
    </section>
  );
}
