import { ExamplePage } from '../../../components/example-page';
import { AgentOperations } from '../../../components/agent-operations';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Agent operations',
  'An inbox of background runs with live steps and cost, a lane per agent with hand-offs, a waterfall of one run with tokens and cost per step, and the tree of who started whom, composed from Unseen UI components with fixed local data.',
  '/patterns/agent-operations/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Agent operations"
      description="The screens an agent product needs once several runs are going at once: an inbox, lanes, a waterfall and a tree, built from RunBoard, AgentLanes, ExecutionTimeline and SubagentTree."
      backHref="/patterns/"
      backLabel="All patterns"
    >
      <AgentOperations />
    </ExamplePage>
  );
}
