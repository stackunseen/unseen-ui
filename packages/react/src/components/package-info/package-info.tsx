import s from '../../shared/styles/devtools.module.css';

export interface PackageDependency {
  name: string;
  version: string;
}
export interface PackageInfoProps {
  name: string;
  currentVersion?: string;
  newVersion?: string;
  changeType?: 'major' | 'minor' | 'patch' | 'added' | 'removed';
  description?: string;
  dependencies?: readonly PackageDependency[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const tone = {
  major: 'danger',
  minor: 'warning',
  patch: 'success',
  added: 'success',
  removed: 'danger',
} as const;

/** A host-reported package change. It does not install or verify anything. */
export function PackageInfo({
  name,
  currentVersion,
  newVersion,
  changeType,
  description,
  dependencies = [],
  headingLevel = 3,
  className = '',
}: PackageInfoProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section className={`${s.root} ${className}`} data-part="package-info">
      <div className={s.header}>
        <div className={s.grow}>
          <Heading className={`${s.title} ${s.mono}`}>{name}</Heading>
          {(currentVersion || newVersion) && (
            <div className={`${s.meta} ${s.mono}`}>
              {currentVersion && newVersion
                ? `${currentVersion} → ${newVersion}`
                : (newVersion ?? currentVersion)}
            </div>
          )}
        </div>
        {changeType && (
          <span className={s.badge} data-tone={tone[changeType]}>
            {changeType}
          </span>
        )}
      </div>
      {description && <p className={`${s.body} ${s.meta}`}>{description}</p>}
      {dependencies.length > 0 && (
        <ul className={s.list} aria-label={`${name} dependencies`}>
          {dependencies.map((dependency) => (
            <li key={dependency.name}>
              <span className={`${s.grow} ${s.mono}`}>{dependency.name}</span>
              <span className={`${s.meta} ${s.mono}`}>{dependency.version}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
