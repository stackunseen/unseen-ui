'use client';
import { useState } from 'react';
import {
  Button,
  StatusBadge,
  Select,
  Accordion,
  AIIcon,
  PromptInput,
  Modal,
  Skeleton,
  LoadingIndicator,
} from '@ai-interaction/react';
import { ThemeOptions } from './theme-options';
import {
  createTheme,
  exportTheme,
  importTheme,
  themeToCSS,
  updateTheme,
} from '@ai-interaction/react/theme';
import type { Appearance, ResolvedTheme, ThemeInput } from '@ai-interaction/react/theme';

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const valid = /^#[\da-fA-F]{6}$/.test(draft);
  return (
    <label className="colour-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={`${label} colour picker`}
          type="color"
          value={value}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          aria-label={`${label} hex`}
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[\da-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
        />
      </div>
      {!valid && (
        <small role="status">
          Enter a six-digit hex colour. The last valid colour is still shown.
        </small>
      )}
    </label>
  );
}
export function ThemeEditor({
  theme,
  onChange,
  appearance,
  onAppearanceChange,
  iconSet,
  onIconSetChange,
}: {
  theme: ResolvedTheme;
  onChange: (theme: ResolvedTheme) => void;
  appearance: Appearance;
  onAppearanceChange: (mode: Appearance) => void;
  iconSet: 'default' | 'lucide';
  onIconSetChange: (value: 'default' | 'lucide') => void;
}) {
  const [history, setHistory] = useState<ResolvedTheme[]>([]);
  const [notice, setNotice] = useState('');
  const [json, setJson] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState('');
  const [previewChoice, setPreviewChoice] = useState('summary');
  const [dialogOpen, setDialogOpen] = useState(false);
  function change(next: ResolvedTheme) {
    setHistory((old) => [...old.slice(-19), theme]);
    onChange(next);
  }
  function update(input: ThemeInput) {
    change(updateTheme(theme, input));
  }
  async function copy(kind: 'css' | 'typescript' | 'json') {
    const text =
      kind === 'css'
        ? themeToCSS(theme, 'brand', appearance)
        : kind === 'typescript'
          ? `import { importTheme } from '@ai-interaction/react/theme';\n\nexport const theme = importTheme(${JSON.stringify(exportTheme(theme))});`
          : exportTheme(theme);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`Copied ${kind === 'css' ? 'CSS' : kind === 'json' ? 'JSON' : 'TypeScript'}.`);
    } catch {
      setJson(text);
      setNotice('Clipboard unavailable. Select and copy the exported text below.');
    }
  }
  const failures = theme.diagnostics.filter((d) => !d.passes);
  return (
    <div className="theme-editor">
      <div className="theme-lead">
        <span className="eyebrow">CUSTOMIZE</span>
        <h1>Theme studio</h1>
        <p>Preview colours and controls, then export the theme for your app.</p>
      </div>
      <div className="theme-editor-grid">
        <section className="theme-controls" aria-label="Theme settings">
          <h2>Brand colours</h2>
          {(['primary', 'secondary', 'accent'] as const).map((role) => (
            <ColourField
              key={`${role}-${revision}`}
              label={role.charAt(0).toUpperCase() + role.slice(1)}
              value={theme.seeds[role]}
              onChange={(value) => update({ [role]: value })}
            />
          ))}
          <div className="preset-row">
            {[
              { name: 'Cobalt', primary: '#2563eb', secondary: '#7c3aed', accent: '#0f766e' },
              { name: 'Forest', primary: '#166534', secondary: '#92400e', accent: '#0f766e' },
              { name: 'Graphite', primary: '#1e293b', secondary: '#475569', accent: '#7c3aed' },
            ].map(({ name, ...preset }) => (
              <Button
                variant="outline"
                key={name}
                onClick={() => {
                  update(preset);
                  setRevision((r) => r + 1);
                }}
              >
                {name}
              </Button>
            ))}
          </div>
          <label className="editor-label">
            Appearance
            <Select
              value={appearance}
              onValueChange={(value) => onAppearanceChange(value as Appearance)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </label>
          <ThemeOptions seeds={theme.seeds} onChange={update} />
          <label className="editor-label">
            Density
            <Select
              value={theme.seeds.density}
              onValueChange={(value) => update({ density: value as 'compact' | 'comfortable' })}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </label>
          <label className="editor-label">
            Component icons
            <Select
              value={iconSet}
              onValueChange={(value) => onIconSetChange(value as 'default' | 'lucide')}
              options={[
                { value: 'default', label: 'Radix · default' },
                { value: 'lucide', label: 'Lucide · outline' },
              ]}
            />
          </label>
          <p className="theme-note">
            Configure IconsProvider in your app to use these icons. Theme exports do not include
            icon settings.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!history.length}
              onClick={() => {
                const previous = history.at(-1);
                if (previous) {
                  onChange(previous);
                  setHistory((h) => h.slice(0, -1));
                  setRevision((r) => r + 1);
                }
              }}
            >
              Undo
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                change(createTheme());
                onAppearanceChange('light');
                onIconSetChange('default');
                setRevision((r) => r + 1);
              }}
            >
              Reset
            </Button>
          </div>
        </section>
        <section className="theme-preview" aria-label="Theme preview">
          <h2 className="sr-only">Theme preview</h2>
          <div className="preview-caption">LIVE COMPONENT PREVIEW</div>
          <div className="theme-demo-message">
            <span className="assistant-mark">
              <AIIcon name="assistant" />
            </span>
            <div>
              <strong>Ready for your review</strong>
              <p>I’ve prepared the account summary. Would you like to continue?</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button>
              <AIIcon name="send" /> Primary action
            </Button>
            <Button variant="secondary">
              <AIIcon name="check" /> Secondary action
            </Button>
            <Button variant="outline">Cancel</Button>
          </div>
          <div className="theme-demo-divider" />
          <div className="theme-live-fields">
            <label className="editor-label">
              Report format
              <Select
                value={previewChoice}
                onValueChange={setPreviewChoice}
                options={[
                  { value: 'summary', label: 'Executive summary' },
                  { value: 'detailed', label: 'Detailed report' },
                ]}
              />
            </label>
            <PromptInput
              value={draft}
              onValueChange={setDraft}
              onSubmit={() => setNotice('Preview only. Your draft has not been sent.')}
              placeholder="Ask about your documents…"
            />
            <p className="theme-note">
              Type, tab through, or open the menu to inspect borders and focus.
            </p>
            <Modal
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              title="Surface preview"
              description="This dialog inherits the same corners, colours and shadow setting."
              trigger={<Button variant="outline">Preview dialog</Button>}
            >
              <p>
                Floating surfaces use elevation. Reading surfaces use spacing and a fine outline.
              </p>
            </Modal>
          </div>
          <div className="theme-demo-divider" />
          <div className="status-grid">
            <StatusBadge state="running" />
            <StatusBadge state="succeeded" />
            <StatusBadge state="waiting-approval" />
            <StatusBadge state="failed" />
          </div>
          <p className="theme-note">
            Status colours retain their meaning when your brand colours change.
          </p>
          <div className="theme-motion-preview">
            <LoadingIndicator label="Loading preview" variant="dots" />
            <Skeleton label="Content preview" lines={2} />
          </div>
          <div className="contrast-report">
            <strong>
              {failures.length
                ? `${failures.length} contrast checks need attention`
                : `${theme.diagnostics.length} token-pair checks passed`}
            </strong>
            <p>
              Text and selected control colours are measured in both modes. This is not a full
              accessibility audit.
            </p>
            {failures.some((d) => d.role.startsWith('control-border')) && (
              <p>
                Subtle borders do not meet the 3:1 boundary target. Use Strong contrast when the
                field boundary is needed to identify the control.
              </p>
            )}
            <Accordion
              type="single"
              collapsible
              items={[
                {
                  value: 'contrast',
                  title: 'Inspect contrast measurements',
                  content: (
                    <ul tabIndex={0} aria-label="Contrast measurements">
                      {theme.diagnostics.map((d) => (
                        <li key={`${d.mode}-${d.role}`}>
                          {d.mode} · {d.role}: {d.ratio.toFixed(2)}:1 / target {d.minimum}:1{' '}
                          {d.passes ? 'Pass' : 'Needs attention'}
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
          </div>
        </section>
      </div>
      <section className="theme-export">
        <h2>Take your theme with you</h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              void copy('css');
            }}
          >
            Copy CSS
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void copy('typescript');
            }}
          >
            Copy TypeScript
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void copy('json');
            }}
          >
            Copy JSON
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([exportTheme(theme)], { type: 'application/json' }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = 'ai-theme.json';
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download JSON
          </Button>
        </div>
        <Accordion
          type="single"
          collapsible
          className="theme-import"
          items={[
            {
              value: 'import',
              title: 'Import a theme',
              content: (
                <>
                  <label className="editor-label">
                    Theme JSON
                    <textarea
                      rows={6}
                      value={json}
                      onChange={(e) => setJson(e.target.value)}
                      maxLength={32_000}
                    />
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        change(importTheme(json));
                        setRevision((r) => r + 1);
                        setNotice('Theme imported.');
                      } catch (error) {
                        setNotice(error instanceof Error ? error.message : 'Invalid theme.');
                      }
                    }}
                  >
                    Import JSON
                  </Button>
                </>
              ),
            },
          ]}
        />
        <p role="status">{notice}</p>
      </section>
    </div>
  );
}
