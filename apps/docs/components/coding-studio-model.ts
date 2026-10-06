import type { TestResult } from '@stackunseen/ui';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type { DocumentIdentity, DocumentSnapshot } from '@stackunseen/ui-core/editing';

export const studioFiles = [
  { id: 'search', path: 'src/search.ts', language: 'typescript' },
  { id: 'app', path: 'src/app.tsx', language: 'tsx' },
  { id: 'tests', path: 'tests/search.test.ts', language: 'typescript' },
  { id: 'readme', path: 'README.md', language: 'markdown' },
] as const;

export const originalSources: Record<string, string> = {
  search: 'export function normalizeQuery(value: string) {\n  return value.toLowerCase();\n}\n',
  app: `import { normalizeQuery } from './search';

export function SearchForm() {
  return (
    <form role="search" action="/search">
      <label htmlFor="query">Search the knowledge base</label>
      <input id="query" name="q" type="search" />
      <button type="submit">Search</button>
    </form>
  );
}

export const exampleQuery = normalizeQuery('  Getting Started  ');
`,
  tests: `import { expect, test } from 'vitest';
import { normalizeQuery } from '../src/search';

test('normalizes letter case', () => {
  expect(normalizeQuery('Hello')).toBe('hello');
});
`,
  readme: `# Search Web

A synthetic knowledge-base search project for the Coding Studio demo.

## Task

Normalize leading and trailing whitespace before searching.
Preserve internal spaces and cover empty queries with regression tests.

## Demo boundary

Files and changes live in memory. The assistant and test output use fixed
sample responses. No model, process, repository or server is connected.
Reload or reset to restore the original files.
`,
};

export const sampleFix = {
  search:
    'export function normalizeQuery(value: string) {\n  return value.trim().toLocaleLowerCase("en-US");\n}\n',
  tests: `import { expect, test } from 'vitest';
import { normalizeQuery } from '../src/search';

test('normalizes letter case', () => {
  expect(normalizeQuery('Hello')).toBe('hello');
});

test('trims leading and trailing whitespace', () => {
  expect(normalizeQuery('  Hello  ')).toBe('hello');
});

test('handles an empty query', () => {
  expect(normalizeQuery('   ')).toBe('');
});

test('preserves internal spaces', () => {
  expect(normalizeQuery('Getting Started')).toBe('getting started');
});
`,
};

export type StudioTask = 'fix' | 'review' | 'plan';
export interface StudioDecision {
  baseVersion: string;
  proposalVersion: string;
  ids: string[];
}
export interface StudioState {
  sources: Record<string, string>;
  drafts: Record<string, string>;
  version: number;
  revision: number;
  sequence: number;
  mode: 'read' | 'workspace';
  operation?: {
    id: number;
    kind: 'task' | 'tests' | 'apply';
    task?: StudioTask;
    fail?: boolean;
    decision?: StudioDecision;
  };
  messages: { id: number; role: 'user' | 'assistant'; text: string }[];
  results: TestResult[];
  testVersion?: string;
  terminal: string;
  terminalState: 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';
  error: string;
  notice: string;
  lastTask?: { text: string; task: StudioTask };
}
export type StudioAction =
  | { type: 'edit'; id: string; text: string; target?: DocumentIdentity }
  | { type: 'revert'; id: string }
  | { type: 'mode'; mode: 'read' | 'workspace' }
  | { type: 'task'; text: string; task: StudioTask; fail?: boolean }
  | { type: 'tests' }
  | { type: 'apply'; decision: StudioDecision }
  | { type: 'finish'; id: number }
  | { type: 'cancel' }
  | { type: 'reset' };

export function createStudioState(sequence = 0): StudioState {
  return {
    sources: { ...originalSources },
    drafts: { ...originalSources },
    version: 1,
    revision: 1,
    sequence,
    mode: 'workspace',
    messages: [
      {
        id: 0,
        role: 'assistant',
        text: 'The sample search function leaves spaces around a query. Run the sample task to prepare a fix, inspect its changes, then apply them to this in-memory workspace.',
      },
    ],
    results: [],
    terminal:
      'Ready. Run sample tests to load a fixture transcript.\nNo command or code will be executed.',
    terminalState: 'idle',
    error: '',
    notice: '',
  };
}
export const baseVersion = (state: StudioState) => `workspace-${state.version}`;
export const proposalVersion = (state: StudioState) =>
  `${baseVersion(state)}-draft-${state.revision}`;
export function studioDocument(state: StudioState, id: string): DocumentSnapshot | undefined {
  const file = studioFiles.find((entry) => entry.id === id);
  return file
    ? {
        documentId: `search-web-demo:${file.id}`,
        version: proposalVersion(state),
        path: file.path,
        language: file.language,
        text: state.drafts[file.id]!,
      }
    : undefined;
}
export function studioChanges(state: StudioState) {
  return studioFiles
    .filter((file) => state.sources[file.id] !== state.drafts[file.id])
    .map((file) => ({
      id: file.id,
      path: file.path,
      before: state.sources[file.id]!,
      after: state.drafts[file.id]!,
    }));
}
function message(state: StudioState, role: 'user' | 'assistant', text: string) {
  return [...state.messages, { id: state.sequence + 1, role, text }].slice(-10);
}
function testFixture(state: StudioState): TestResult[] {
  const knownFix =
    state.drafts.search === sampleFix.search && state.drafts.tests === sampleFix.tests;
  const knownOriginal =
    state.drafts.search === originalSources.search && state.drafts.tests === originalSources.tests;
  return [
    'normalizes letter case',
    'trims leading and trailing whitespace',
    'handles an empty query',
    'preserves internal spaces',
  ].map((name, index) => ({
    id: `test-${index}`,
    name,
    file: 'tests/search.test.ts',
    state: knownFix
      ? 'passed'
      : knownOriginal
        ? index === 1 || index === 2
          ? 'failed'
          : 'passed'
        : 'skipped',
    detail: knownFix
      ? undefined
      : knownOriginal && (index === 1 || index === 2)
        ? `Fixed baseline fixture:\nExpected: ${index === 1 ? '"hello"' : '""'}\nReceived: ${index === 1 ? '"  hello  "' : '"   "'}\n\nThis is sample output; no test was executed.`
        : !knownOriginal
          ? 'Results unavailable for custom edits. This demo only has baseline and sample-fix fixtures; it never executes edited code.'
          : undefined,
  }));
}

/** A deterministic demo host. Source strings are stored and displayed, never evaluated. */
export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  if (action.type === 'reset') return createStudioState(state.sequence + 1);
  if (action.type === 'cancel')
    return {
      ...state,
      operation: undefined,
      sequence: state.sequence + 1,
      terminalState: state.operation?.kind === 'tests' ? 'cancelled' : state.terminalState,
      notice: 'Demo operation stopped. Files were preserved.',
    };
  if (action.type === 'finish') {
    const operation = state.operation;
    if (!operation || operation.id !== action.id) return state;
    const done = { ...state, operation: undefined, error: '', sequence: state.sequence + 1 };
    if (operation.kind === 'task') {
      if (operation.fail)
        return {
          ...done,
          error:
            'The simulated assistant is unavailable. Retry the saved request; your files and draft were preserved.',
        };
      if (operation.task === 'fix') {
        if (
          ['search', 'tests'].some(
            (id) =>
              state.drafts[id] !== state.sources[id] &&
              state.drafts[id] !== sampleFix[id as keyof typeof sampleFix],
          )
        )
          return {
            ...done,
            error:
              'The sample patch would replace a custom draft. Review or revert your edits before preparing this sample fix.',
          };
        const alreadyPresent =
          state.drafts.search === sampleFix.search && state.drafts.tests === sampleFix.tests;
        return {
          ...done,
          drafts: { ...state.drafts, ...sampleFix },
          revision: state.revision + (alreadyPresent ? 0 : 1),
          notice: alreadyPresent
            ? 'The sample fix is already present. No draft files were changed.'
            : 'Sample patch prepared. No files have been applied.',
          messages: message(
            state,
            'assistant',
            alreadyPresent
              ? 'The sample fix is already present in the displayed files. No additional edits were prepared.'
              : 'Prepared two draft changes: trim query whitespace, and add regression tests for whitespace, empty queries and internal spaces. Review the exact diff before applying. This is a fixed sample response.',
          ),
        };
      }
      return {
        ...done,
        messages: message(
          state,
          'assistant',
          operation.task === 'plan'
            ? 'Sample plan: 1. Trim outer whitespace. 2. Normalize case with an explicit locale. 3. Preserve internal spaces. 4. Cover whitespace, empty queries and mixed case. No files were changed.'
            : `${studioChanges(state).length} draft files differ from ${baseVersion(state)}. The sample fix trims outer whitespace and adds regression cases. Test results are fixture output; connect your own host to validate real behavior. No files were changed.`,
        ),
        notice: 'Sample response complete.',
      };
    }
    if (operation.kind === 'tests') {
      const results = testFixture(state);
      const failed = results.some((result) => result.state === 'failed');
      return {
        ...done,
        results,
        testVersion: proposalVersion(state),
        terminalState: failed ? 'failed' : 'complete',
        terminal: `Fixture transcript for ${proposalVersion(state)}\n\n${results.map((result) => `${result.state.toUpperCase()}  ${result.name}`).join('\n')}\n\n${results.filter((result) => result.state === 'passed').length} passed, ${results.filter((result) => result.state === 'failed').length} failed, ${results.filter((result) => result.state === 'skipped').length} skipped.\nSimulated output. No process or edited code was executed.`,
        notice: failed
          ? 'Baseline fixture includes a whitespace failure.'
          : results.every((result) => result.state === 'skipped')
            ? 'Custom edits have no test fixture. No code was executed.'
            : 'Sample-fix fixture loaded: four passed. No tests were executed.',
      };
    }
    const decision = operation.decision!;
    const changes = studioChanges(state);
    if (
      state.mode !== 'workspace' ||
      decision.baseVersion !== baseVersion(state) ||
      decision.proposalVersion !== proposalVersion(state) ||
      !decision.ids.length ||
      decision.ids.some((id) => !changes.some((change) => change.id === id))
    )
      return {
        ...done,
        error:
          'The reviewed versions or access changed. Review the current changes again before applying.',
      };
    const sources = { ...state.sources };
    for (const id of decision.ids) sources[id] = state.drafts[id]!;
    return {
      ...done,
      sources,
      version: state.version + 1,
      revision: state.revision + 1,
      notice: `Demo host acknowledged ${decision.ids.length} applied files as workspace-${state.version + 1}. Changes exist only in memory.`,
      messages: message(
        state,
        'assistant',
        `Applied ${decision.ids.length} reviewed files to the in-memory workspace. The receipt binds ${decision.baseVersion} and ${decision.proposalVersion}. No repository or disk files were changed.`,
      ),
    };
  }
  if (state.operation) return state;
  if (action.type === 'mode')
    return {
      ...state,
      mode: action.mode,
      notice: `Demo host acknowledged ${action.mode === 'read' ? 'read-only' : 'workspace'} access. Real permissions were not changed.`,
      error: '',
    };
  if (action.type === 'edit' || action.type === 'revert') {
    if (state.mode !== 'workspace' || !studioFiles.some((file) => file.id === action.id))
      return state;
    if (
      action.type === 'edit' &&
      action.target &&
      !sameDocumentIdentity(action.target, studioDocument(state, action.id)!)
    )
      return {
        ...state,
        error: 'The editor request targets an older draft. Your current file was preserved.',
      };
    const text = action.type === 'revert' ? state.sources[action.id]! : action.text;
    if (text.length > 20_000)
      return { ...state, error: 'The demo editor accepts up to 20,000 characters per file.' };
    return {
      ...state,
      drafts: { ...state.drafts, [action.id]: text },
      revision: state.revision + 1,
      error: '',
      notice: '',
    };
  }
  if (action.type === 'task') {
    if (!action.text.trim() || action.text.length > 20_000) return state;
    if (action.task === 'fix' && state.mode !== 'workspace')
      return {
        ...state,
        error:
          'Read-only mode cannot prepare edits. Request workspace access in Session settings, or use /review.',
      };
    return {
      ...state,
      operation: { id: state.sequence + 1, kind: 'task', task: action.task, fail: action.fail },
      sequence: state.sequence + 1,
      messages: message(state, 'user', action.text),
      lastTask: { text: action.text, task: action.task },
      error: '',
      notice: '',
    };
  }
  if (action.type === 'tests')
    return {
      ...state,
      operation: { id: state.sequence + 1, kind: 'tests' },
      sequence: state.sequence + 1,
      terminalState: 'running',
      terminal: 'Loading the matching sample test fixture…\nNo process is running.',
      error: '',
      notice: '',
    };
  if (action.type === 'apply')
    return {
      ...state,
      operation: {
        id: state.sequence + 1,
        kind: 'apply',
        decision: { ...action.decision, ids: [...action.decision.ids] },
      },
      sequence: state.sequence + 1,
      error: '',
      notice: '',
    };
  return state;
}
