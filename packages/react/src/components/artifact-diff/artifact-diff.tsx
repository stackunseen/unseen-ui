'use client';
import { Select } from '../select/select.js';
import { CodeDiff } from '../code-diff/code-diff.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';

export interface ArtifactVersion {
  id: string;
  label: string;
  text: string;
  author: string;
  access: 'available' | 'revoked';
}

export interface ArtifactDiffProps extends VariantProps<'ArtifactDiff'> {
  path: string;
  versions: readonly ArtifactVersion[];
  beforeId: string;
  afterId: string;
  onVersionsChange: (selection: { beforeId: string; afterId: string }) => void;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<ArtifactDiffLabels>;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
export interface ArtifactDiffLabels {
  from: string;
  to: string;
  /** Accessible names of the two version pickers. */
  fromName: string;
  toName: string;
  unavailable: string;
  sameVersion: string;
  /** Names the version whose access was withdrawn. */
  revoked: (version: string) => string;
}
const defaultLabels: ArtifactDiffLabels = {
  from: 'Compare from',
  to: 'Compare to',
  fromName: 'Original artifact version',
  toName: 'Updated artifact version',
  unavailable: 'A selected version is unavailable or ambiguous.',
  sameVersion: 'Both sides show the same version. Choose a different version to compare.',
  revoked: (version) => `Access to ${version} was withdrawn, so its text is not shown.`,
};

export function ArtifactDiff({
  path,
  versions,
  beforeId,
  afterId,
  onVersionsChange,
  variant = 'unified',
  labels,
  className = '',
}: ArtifactDiffProps) {
  const text = { ...defaultLabels, ...labels };
  const before = versions.filter((version) => version.id === beforeId),
    after = versions.filter((version) => version.id === afterId);
  const options = versions.map((version) => ({ value: version.id, label: version.label }));
  return (
    <div className={`${s.root} ${className}`} data-part="artifact-diff" data-variant={variant}>
      <div className={s.options}>
        <label>
          {text.from}
          <Select
            aria-label={text.fromName}
            value={before.length === 1 ? beforeId : ''}
            options={options}
            onValueChange={(id) => onVersionsChange({ beforeId: id, afterId })}
          />
        </label>
        <label>
          {text.to}
          <Select
            aria-label={text.toName}
            value={after.length === 1 ? afterId : ''}
            options={options}
            onValueChange={(id) => onVersionsChange({ beforeId, afterId: id })}
          />
        </label>
      </div>
      {before.length !== 1 || after.length !== 1 ? (
        <p role="status" className={s.warning}>
          {text.unavailable}
        </p>
      ) : (
        <>
          {beforeId === afterId ? (
            <p role="status" className={s.warning}>
              {text.sameVersion}
            </p>
          ) : (
            <p className={s.muted}>
              {before[0]!.author} → {after[0]!.author}
            </p>
          )}
          {[before[0]!, after[0]!]
            .filter(
              (version, index, both) =>
                version.access === 'revoked' && both.indexOf(version) === index,
            )
            .map((version) => (
              <p key={version.id} role="status" className={s.warning}>
                {text.revoked(version.label)}
              </p>
            ))}
          <CodeDiff
            path={path}
            before={before[0]!.text}
            after={after[0]!.text}
            baseVersion={beforeId}
            nextVersion={afterId}
            variant={variant}
            status={
              before[0]!.access === 'revoked' || after[0]!.access === 'revoked' ? 'denied' : 'ready'
            }
          />
        </>
      )}
    </div>
  );
}
