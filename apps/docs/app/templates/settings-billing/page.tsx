import { TemplateViewport } from '../../../components/template-viewport';
import { SettingsBillingScreen } from '../../../components/screens/settings-billing-screen';
import '@stackunseen/ui/application.css';
import '@stackunseen/ui/conversation-flow.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'Settings and billing template',
  'Workspace settings with a save footer, model defaults and budgets, API keys shown once, and the plan with usage and invoices. Built from Unseen UI components with sample data.',
  '/templates/settings-billing/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace template-app-mode" tabIndex={-1}>
      <TemplateViewport backHref="/templates/" backLabel="All templates">
        <SettingsBillingScreen />
      </TemplateViewport>
    </main>
  );
}
