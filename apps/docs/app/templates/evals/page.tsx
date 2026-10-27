import { EvalsScreen } from '../../../components/screens/evals-screen';
import '@stackunseen/ui/application.css';
import '@stackunseen/ui/conversation-flow.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'Evaluations template',
  'Scores per suite and model over time, failing cases and a comparison of two runs, from an eval service with the meaning of every number kept. Built from Unseen UI components with sample data.',
  '/templates/evals/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace template-app-mode" tabIndex={-1}>
      <a className="web-text-link template-workspace-back" href="/templates/">
        All templates
      </a>
      <header className="template-workspace-heading">
        <h1>Evaluations</h1>
        <p>Scores per suite and model over time, failing cases and a comparison of two runs, from an eval service with the meaning of every number kept.</p>
      </header>
      <EvalsScreen />
    </main>
  );
}
