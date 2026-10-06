import { ExamplePage } from '../../../components/example-page';
import { Workbench } from '../../../components/workbench';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Agent Workbench',
  'Try an account-review workflow with conversations, tool results, source inspection and human review in a locally simulated Unseen UI workspace.',
  '/patterns/agent-workbench/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Agent Workbench"
      description="Review sample accounts and decide on actions in a local customer-operations workspace."
      backHref="/templates/"
      backLabel="All templates"
      workspace
    >
      <Workbench />
    </ExamplePage>
  );
}
