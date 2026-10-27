import Link from 'next/link';
import { ExamplePage } from '../../components/example-page';
import { componentTasks } from '../../lib/tasks';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Build by task',
  'Pick what you are building and see the Unseen UI components that do it together: AI chat, agent execution, approvals, generated interfaces, sources, MCP, forms, tables and navigation.',
  '/tasks/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Build by task"
      eyebrow="start from the job"
      description="Start from what you are building. Each page shows the components for that job, live, with the imports to use them."
      listing
    >
      <ul className="task-list">
        {componentTasks.map((task) => (
          <li key={task.id}>
            <Link href={`/tasks/${task.id}/`}>
              <strong>{task.label}</strong>
              <span>{task.description}</span>
              <small>{task.components.slice(0, 5).join(', ')}</small>
              <em>{task.components.length} components</em>
            </Link>
          </li>
        ))}
      </ul>
    </ExamplePage>
  );
}
