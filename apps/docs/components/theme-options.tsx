'use client';
import { Accordion, Select } from '@stackunseen/ui';
import type { ResolvedTheme, ThemeInput } from '@stackunseen/ui/theme';

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="editor-label">
      {label}
      <Select value={value} options={options} onValueChange={(v) => onChange(v as T)} />
    </label>
  );
}

export function ThemeOptions({
  seeds,
  onChange,
}: {
  seeds: ResolvedTheme['seeds'];
  onChange: (value: ThemeInput) => void;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['borders']}
      region={false}
      items={[
        {
          value: 'borders',
          title: 'Borders & surfaces',
          content: (
            <>
              <Choice
                label="Border strength"
                value={seeds.borderStrength}
                onChange={(borderStrength) => onChange({ borderStrength })}
                options={[
                  { value: 'subtle', label: 'Subtle' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'strong', label: 'Strong contrast' },
                ]}
              />
              <label className="editor-label">
                Border width
                <Select
                  value={String(seeds.borderWidth)}
                  onValueChange={(v) => onChange({ borderWidth: Number(v) as 1 | 2 })}
                  options={[
                    { value: '1', label: '1px · fine' },
                    { value: '2', label: '2px · defined' },
                  ]}
                />
              </label>
              <Choice
                label="Field background"
                value={seeds.fieldSurface}
                onChange={(fieldSurface) => onChange({ fieldSurface })}
                options={[
                  { value: 'plain', label: 'Plain' },
                  { value: 'tinted', label: 'Tinted' },
                ]}
              />
              <Choice
                label="Floating shadows"
                value={seeds.elevation}
                onChange={(elevation) => onChange({ elevation })}
                options={[
                  { value: 'flat', label: 'None' },
                  { value: 'soft', label: 'Soft' },
                  { value: 'lifted', label: 'Lifted' },
                ]}
              />
              <p className="theme-note">
                Shadows apply to menus and dialogs. Cards stay flat. Focus outlines stay visible at
                every border strength.
              </p>
            </>
          ),
        },
        {
          value: 'shape',
          title: 'Corners & motion',
          content: (
            <>
              {(
                [
                  { key: 'radius', label: 'Surface corners' },
                  { key: 'controlRadius', label: 'Control corners' },
                  { key: 'composerRadius', label: 'Composer corners' },
                ] as const
              ).map(({ key, label }) => (
                <label className="editor-label" key={key}>
                  {label} · {seeds[key]}px
                  <input
                    aria-label={label}
                    type="range"
                    min="0"
                    max="24"
                    value={seeds[key]}
                    onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <Choice
                label="Motion"
                value={seeds.motion}
                onChange={(motion) => onChange({ motion })}
                options={[
                  { value: 'system', label: 'Respect device preference' },
                  { value: 'reduced', label: 'Always reduced' },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
