'use client';
import { Button, StatusBadge } from '@ai-interaction/react';
import type { ResolvedTheme } from '@ai-interaction/react/theme';
import { ActionPlacementDemo } from './action-placement-demo';
import { WorkspaceExample } from '../../../examples/consumer/src/workspace-example';
import { UploadExample } from '../../../examples/consumer/src/upload-example';
import { RecoveryExample } from '../../../examples/consumer/src/recovery-example';
import { ViewportExample } from '../../../examples/consumer/src/viewport-example';
import { ConversationExample } from '../../../examples/consumer/src/conversation-example';

export function DesignGuide({
  theme,
  onCustomize,
}: {
  theme: ResolvedTheme;
  onCustomize: () => void;
}) {
  return (
    <article className="design-guide">
      <div className="page-heading">
        <span className="eyebrow">DESIGN FOUNDATIONS</span>
        <h1>Quiet surfaces. Clear decisions.</h1>
        <p>Explore colour, spacing and interaction patterns using your current theme.</p>
        <Button onClick={onCustomize}>Customize in Theme studio</Button>
      </div>
      <section className="design-section">
        <div>
          <span className="eyebrow">01 · COLOUR</span>
          <h2>Give colour a job.</h2>
          <p>
            Primary marks actions and selection. Secondary supports a second action. Success,
            warning and failure retain a separate meaning, reinforced with text and icons.
          </p>
        </div>
        <div>
          <div className="design-swatches">
            {(
              ['surface', 'surface-subtle', 'border', 'primary', 'secondary', 'accent'] as const
            ).map((role) => (
              <div key={role}>
                <span style={{ background: `var(--ai-${role})` }} />
                <code>{role}</code>
              </div>
            ))}
          </div>
          <div className="status-grid">
            <StatusBadge state="running" />
            <StatusBadge state="succeeded" />
            <StatusBadge state="waiting-approval" />
            <StatusBadge state="failed" />
          </div>
        </div>
      </section>
      <section className="design-section">
        <div>
          <span className="eyebrow">02 · SHAPE</span>
          <h2>Corners follow purpose.</h2>
          <p>Controls, reading surfaces and composers use separate corner tokens.</p>
        </div>
        <div className="design-shapes">
          {[
            { label: 'Control', token: 'control-radius', value: theme.seeds.controlRadius },
            { label: 'Surface', token: 'radius', value: theme.seeds.radius },
            { label: 'Composer', token: 'composer-radius', value: theme.seeds.composerRadius },
          ].map((item) => (
            <div key={item.token} style={{ borderRadius: `var(--ai-${item.token})` }}>
              <strong>{item.label}</strong>
              <code>{item.value}px</code>
            </div>
          ))}
        </div>
      </section>
      <section className="design-section">
        <div>
          <span className="eyebrow">03 · EDGES & ELEVATION</span>
          <h2>One edge is enough.</h2>
          <p>
            Inputs use a single fine outline, without an inset bevel or permanent ring. Keyboard
            focus adds a clear indicator. Menus and dialogs can lift; ordinary cards stay flat.
          </p>
        </div>
        <div className="design-surface-samples">
          <div>
            Reading surface<small>Fine border · no shadow</small>
          </div>
          <div>
            Floating surface<small>{theme.seeds.elevation} elevation</small>
          </div>
        </div>
      </section>
      <section className="design-section">
        <div>
          <span className="eyebrow">04 · INTERACTION</span>
          <h2>Clarity through every state.</h2>
          <p>
            Keep labels and destructive action details visible. Disclosures hold supporting
            information. Motion respects device preferences.
          </p>
        </div>
        <div>
          <h3>Check the finished interface</h3>
          <ul>
            <li>Tab order, focus return and accessible names.</li>
            <li>Light, dark, mobile, long content and empty states.</li>
            <li>Text, field-boundary and focus contrast in context.</li>
            <li>Loading, errors, stale data and unknown outcomes.</li>
          </ul>
          <p>
            Strong contrast is the default for field boundaries. Subtle boundaries remain an
            explicit theme choice and fall below the 3:1 token target. Check the actual surrounding
            surfaces; token checks alone do not establish accessibility conformance.
          </p>
        </div>
      </section>
      <section className="design-placement-section">
        <span className="eyebrow">05 · SPACE & ACTIONS</span>
        <h2>Keep actions with their content.</h2>
        <p>
          Keep row actions beside their item and Send after the composer tools. Controls wrap in
          narrow panels. Try editing a queued draft or renaming a conversation.
        </p>
        <p>
          Shared spacing follows 4, 8, 12, 16, 24, 32 and 48px. Default panels use 16px padding and
          40px controls; compact density uses 12px padding and 36px controls. Touch controls retain
          44px targets in either density.
        </p>
        <ActionPlacementDemo />
        <ConversationExample />
        <ViewportExample />
      </section>
      <section className="design-placement-section">
        <span className="eyebrow">06 · APPLICATION FOUNDATIONS</span>
        <h2>A workspace around the components.</h2>
        <p>
          The workspace has named regions and a resizable inspector that becomes a drawer on narrow
          screens.
        </p>
        <WorkspaceExample />
      </section>
      <section className="design-placement-section">
        <span className="eyebrow">07 · RECOVERY & OWNERSHIP</span>
        <h2>Keep the original request in view.</h2>
        <p>
          Transport, current data, acknowledgement and execution have separate meanings. Try a lost
          response, inspect its original receipt and apply an explicit local host update.
        </p>
        <RecoveryExample />
      </section>
      <section className="design-placement-section">
        <span className="eyebrow">08 · ATTACHMENTS &amp; RECOVERY</span>
        <h2>Keep each file and its actions together.</h2>
        <p>
          Three compact layouts share committed byte counts, exact original receipts and explicit
          access states.
        </p>
        <UploadExample />
      </section>
      <footer className="design-reference-note">
        Reference studies: <a href="https://www.assistant-ui.com/design">assistant-ui design</a> and{' '}
        <a href="https://elements.ai-sdk.dev/components/attachments">AI Elements attachments</a>.
      </footer>
    </article>
  );
}
