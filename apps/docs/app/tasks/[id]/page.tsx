import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { ExamplePage } from '../../../components/example-page';
import { TaskExamples } from '../../../components/task-examples';
import { CodePanel } from '../../../components/code-panel';
import { catalog } from '../../../lib/catalog';
import { componentTasks, tasksFor } from '../../../lib/tasks';
import { componentHref } from '../../../lib/site-paths';
import { componentPreview } from '../../../lib/component-previews';
import { importBlock } from '../../../lib/component-import';
import { pageMetadata } from '../../../lib/site-seo';

export const dynamicParams = false;
export function generateStaticParams() {
  return componentTasks.map((task) => ({ id: task.id }));
}

/** The pattern that shows each task end to end, where one exists. */
const patterns: Record<string, { href: string; label: string }> = {
  'ai-chat': { href: '/patterns/ai-sdk-chat/', label: 'Chat on the Vercel AI SDK' },
  'agent-execution': { href: '/patterns/agent-workbench/', label: 'Agent Workbench' },
  'ai-review': { href: '/patterns/action-receipts/', label: 'Approval and action receipts' },
  sources: { href: '/patterns/research-answers/', label: 'Research answers' },
  runs: { href: '/patterns/recoverable-chat/', label: 'Recoverable chat' },
  'enterprise-forms': { href: '/templates/saas-admin/', label: 'SaaS admin' },
  data: { href: '/templates/saas-admin/', label: 'SaaS admin' },
  navigation: { href: '/templates/marketing/', label: 'Marketing website' },
};
/** Live examples to show first; the chat task leads with the whole Chat. */
const featured: Record<string, readonly string[]> = {
  'ai-chat': ['PromptInput', 'Message'],
  'agent-execution': ['AgentSteps', 'ToolCall'],
  runs: ['RunBoard', 'AttentionQueue'],
  'ai-review': ['ApprovalCard', 'DryRunPreview'],
  'generative-ui': ['GeneratedUI', 'Chart'],
  sources: ['Sources', 'EvidenceGroup'],
  mcp: ['MCPServerCard', 'MCPToolList'],
  'enterprise-forms': ['Field', 'Select'],
  data: ['DataGrid', 'Table'],
  navigation: ['CommandPalette', 'Tabs'],
};

function findTask(id: string) {
  const task = componentTasks.find((item) => item.id === id);
  return task ? tasksFor(task.components[0]!).find((item) => item.id === id) : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = findTask(id);
  if (!task) notFound();
  return pageMetadata(
    `${task.label}: components and examples`,
    `${task.description} The Unseen UI components for ${task.label.toLowerCase()}, with live examples and the imports to use them.`,
    `/tasks/${task.id}/`,
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = findTask(id);
  if (!task) notFound();
  const entries = task.components
    .map((name) => catalog.find((entry) => entry.name === name))
    .filter((entry) => entry !== undefined);
  const pattern = patterns[task.id];
  return (
    <ExamplePage
      title={task.label}
      description={task.description}
      backHref="/tasks/"
      backLabel="All tasks"
      listing
    >
      <h2 className="task-examples-title">Live examples</h2>
      <TaskExamples
        names={featured[task.id] ?? task.components.slice(0, 2)}
        chat={task.id === 'ai-chat'}
      />
      <section className="task-section" aria-labelledby="task-components-title">
        <h2 id="task-components-title">The components</h2>
        <div className="directory-group" data-view="gallery">
          <ul>
            {entries.map((entry) => {
              const preview = componentPreview(entry.name);
              return (
                <li key={entry.name}>
                  <Link prefetch={false} href={componentHref(entry.name)}>
                    <span className="directory-thumb" aria-hidden="true">
                      {preview ? (
                        <>
                          <img
                            className="directory-thumb-light"
                            src={`${preview}-light.webp`}
                            alt=""
                            width={480}
                            height={300}
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            className="directory-thumb-dark"
                            src={`${preview}-dark.webp`}
                            alt=""
                            width={480}
                            height={300}
                            loading="lazy"
                            decoding="async"
                          />
                        </>
                      ) : (
                        <span className="directory-thumb-name">{entry.name}</span>
                      )}
                    </span>
                    <span className="directory-text">
                      <strong>
                        {entry.name}
                        <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
                      </strong>
                      <span>{entry.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <section className="task-section" aria-labelledby="task-imports-title">
        <h2 id="task-imports-title">Imports</h2>
        <p className="collection-note">
          Install once with <code>npm install @stackunseen/ui</code>, then import what you use.
        </p>
        <CodePanel>{importBlock(entries)}</CodePanel>
      </section>
      {pattern && (
        <p className="collection-note">
          See them working together in <Link href={pattern.href}>{pattern.label}</Link>.
        </p>
      )}
    </ExamplePage>
  );
}
