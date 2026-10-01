import { AITheme, componentVariants } from '../../packages/react/dist/index.js';
import type { VariantComponent } from '../../packages/react/dist/index.js';
import { Specimen } from '../../apps/docs/components/specimen';
export function VariantGallery({
  name = 'PromptInput',
  state = 'Default',
  dark = false,
}: {
  name?: VariantComponent;
  state?: string;
  dark?: boolean;
}) {
  return (
    <AITheme
      appearance={dark ? 'dark' : 'light'}
      style={{ background: 'var(--ai-surface-subtle)', padding: 24 }}
    >
      <div style={{ display: 'grid', gap: 24, maxWidth: 720, marginInline: 'auto' }}>
        {componentVariants[name].map((variant) => (
          <section
            key={variant}
            style={{
              background: 'var(--ai-surface)',
              padding: 24,
              borderRadius: 'var(--ai-radius)',
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 14, margin: '0 0 20px', textTransform: 'capitalize' }}>
              {variant}
            </h2>
            <Specimen name={name} variant={state} presentation={variant} />
          </section>
        ))}
      </div>
    </AITheme>
  );
}
