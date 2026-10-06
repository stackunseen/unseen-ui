import { ExamplePage } from '../../../components/example-page';
import { WorkspaceIntegrations } from '../../../components/workspace-upgrades/workspace-integrations';
import { pageMetadata } from '../../../lib/site-seo';
import { Accordion } from '@stackunseen/ui';
import s from '../../../components/workspace-upgrades/workspace-integrations.module.css';
import '@stackunseen/ui/editor.css';
import '@stackunseen/ui/artifact-editor.css';
import '@stackunseen/ui/conversation-flow.css';
export const metadata = pageMetadata(
  'Workspace integrations',
  'Try controlled editing, file reviews, artifact drafts and conversation revisions with a bounded local host.',
  '/patterns/workspace-integrations/',
);
export default function Page() {
  return (
    <div className={s.page}>
      <ExamplePage
        title="Workspace integrations"
        description=""
        backHref="/patterns/coding-studio/"
        backLabel="Coding Studio"
      >
        <WorkspaceIntegrations />
        <div className={s.guide}>
          <Accordion
            type="single"
            collapsible
            headingLevel={2}
            items={[
              {
                value: 'integration',
                title: 'Integration details',
                keepMounted: true,
                content: (
                  <div>
                    <p>
                      Import CodeEditor from @stackunseen/ui/editor; ArtifactEditor from
                      @stackunseen/ui/artifact-editor; MessageEditForm and
                      ConversationMessageActions from @stackunseen/ui/conversation-flow.
                      ReviewChanges, PromptInput and MentionPicker remain in the root entry.
                    </p>
                    <p>
                      Import styles.css and the corresponding editor.css, artifact-editor.css or
                      conversation-flow.css. CodeMirror peers belong only to the editor.
                      ArtifactEditor accepts a trusted renderEditor slot for custom editing
                      surfaces.
                    </p>
                    <p>
                      The host supplies document revisions, command identities, permissions and
                      receipts. Pending and unknown outcomes require reconciliation of the original
                      request. Authentication, durable storage, filesystem changes and model
                      services belong to your host.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </ExamplePage>
    </div>
  );
}
