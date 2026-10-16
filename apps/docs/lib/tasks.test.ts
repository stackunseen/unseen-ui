import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { componentTasks, tasksFor, taskTerms } from './tasks';
import { componentSearchText, searchCatalog } from './gallery-navigation';

describe('component tasks', () => {
  it('name only components that exist, each task at least three', () => {
    const names = new Set(catalog.map((entry) => entry.name));
    for (const task of componentTasks) {
      expect(task.components.length).toBeGreaterThanOrEqual(3);
      for (const name of task.components) expect(names.has(name), `${task.id}: ${name}`).toBe(true);
    }
    expect(new Set(componentTasks.map((task) => task.id)).size).toBe(componentTasks.length);
  });

  it('feed search so a job finds its components', () => {
    expect(tasksFor('PromptInput').map((task) => task.id)).toEqual(['ai-chat']);
    expect(taskTerms('ToolCall')).toEqual(['agent execution', 'agent execution']);
    const entry = catalog.find((item) => item.name === 'StreamingResponse')!;
    expect(componentSearchText(entry)).toContain('ai chat');
    const chat = searchCatalog('AI chat').map((item) => item.name);
    for (const name of ['PromptInput', 'Message', 'StreamingResponse', 'MessageActions'])
      expect(chat).toContain(name);
    expect(searchCatalog('approvals').map((item) => item.name)).toContain('ApprovalCard');
  });
});
