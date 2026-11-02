import { TemplateViewport } from '../../../components/template-viewport';
import { AppShellsScreen } from '../../../components/screens/app-shells-screen';
import '@stackunseen/ui/application.css';
import '@stackunseen/ui/conversation-flow.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'App shells template',
  'Three application shells from WorkspaceShell: a dashboard with an inspector, a chat app with collapsing navigation, and a contained tool. Built from Unseen UI components with sample data.',
  '/templates/app-shells/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace template-app-mode" tabIndex={-1}>
      <TemplateViewport backHref="/templates/" backLabel="All templates">
        <header className="template-workspace-heading">
          <h1>App shells</h1>
          <p>
            Three application shells from WorkspaceShell: a dashboard with an inspector, a chat app
            with collapsing navigation, and a contained tool.
          </p>
        </header>
        <AppShellsScreen />
      </TemplateViewport>
    </main>
  );
}
