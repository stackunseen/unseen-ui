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
}

export function ArtifactDiff({
  path,
  versions,
  beforeId,
  afterId,
  onVersionsChange,
  variant = 'unified',
}: ArtifactDiffProps) {
  const before = versions.filter((version) => version.id === beforeId),
    after = versions.filter((version) => version.id === afterId);
  const options = versions.map((version) => ({ value: version.id, label: version.label }));
  return (
    <div className={s.root} data-part="artifact-diff" data-variant={variant}>
      <div className={s.options}>
        <label>
          Compare from
          <Select
            aria-label="Original artifact version"
            value={before.length === 1 ? beforeId : ''}
            options={options}
            onValueChange={(id) => onVersionsChange({ beforeId: id, afterId })}
          />
        </label>
        <label>
          Compare to
          <Select
            aria-label="Updated artifact version"
            value={after.length === 1 ? afterId : ''}
            options={options}
            onValueChange={(id) => onVersionsChange({ beforeId, afterId: id })}
          />
        </label>
      </div>
      {before.length !== 1 || after.length !== 1 ? (
        <p role="status" className={s.warning}>
          A selected version is unavailable or ambiguous.
        </p>
      ) : (
        <>
          <p className={s.muted}>
            {before[0]!.author} → {after[0]!.author}
          </p>
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
