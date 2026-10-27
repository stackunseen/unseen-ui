import { AnalyticsScreen } from '../../../components/screens/analytics-screen';
import '@stackunseen/ui/application.css';
import '@stackunseen/ui/conversation-flow.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'Analytics template',
  'Requests, latency, tool health, spend per agent and context-window use for an agent product, from a metrics service. Built from Unseen UI components with sample data.',
  '/templates/analytics/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace template-app-mode" tabIndex={-1}>
      <a className="web-text-link template-workspace-back" href="/templates/">
        All templates
      </a>
      <header className="template-workspace-heading">
        <h1>Analytics</h1>
        <p>Requests, latency, tool health, spend per agent and context-window use for an agent product, from a metrics service.</p>
      </header>
      <AnalyticsScreen />
    </main>
  );
}
