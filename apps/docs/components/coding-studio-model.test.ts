import { describe, expect, it } from 'vitest';
import {
  baseVersion,
  createStudioState,
  originalSources,
  proposalVersion,
  sampleFix,
  studioChanges,
  studioReducer,
  studioDocument,
} from './coding-studio-model';
import type { StudioState } from './coding-studio-model';

function finish(state: StudioState) {
  return studioReducer(state, { type: 'finish', id: state.operation!.id });
}
function prepared() {
  return finish(
    studioReducer(createStudioState(), {
      type: 'task',
      task: 'fix',
      text: 'Prepare the sample fix.',
    }),
  );
}

describe('Coding Studio local demo server', () => {
  it('keeps prepared files as drafts until an exact review receives acknowledgment', () => {
    let state = prepared();
    expect(studioChanges(state)).toHaveLength(2);
    expect(state.sources.search).toBe(originalSources.search);
    const decision = {
      baseVersion: baseVersion(state),
      proposalVersion: proposalVersion(state),
      ids: ['search', 'tests'],
    };
    state = studioReducer(state, { type: 'apply', decision });
    expect(state.sources.search).toBe(originalSources.search);
    expect(state.operation?.kind).toBe('apply');
    state = finish(state);
    expect(state.sources.search).toBe(sampleFix.search);
    expect(studioChanges(state)).toHaveLength(0);
    expect(state.notice).toContain('acknowledged 2 applied files as workspace-2');
    const revision = state.revision;
    state = finish(
      studioReducer(state, { type: 'task', task: 'fix', text: 'Prepare the same fix.' }),
    );
    expect(state.revision).toBe(revision);
    expect(state.notice).toContain('already present');
  });

  it('rejects a stale proposal, unknown file, and read-only apply without changing files', () => {
    for (const variant of ['stale', 'unknown', 'read']) {
      let state = prepared();
      if (variant === 'read') state = studioReducer(state, { type: 'mode', mode: 'read' });
      state = finish(
        studioReducer(state, {
          type: 'apply',
          decision: {
            baseVersion: baseVersion(state),
            proposalVersion: variant === 'stale' ? 'old-draft' : proposalVersion(state),
            ids: variant === 'unknown' ? ['not-a-file'] : ['search'],
          },
        }),
      );
      expect(state.sources).toEqual(originalSources);
      expect(state.error).toContain('versions or access changed');
    }
  });

  it('preserves custom drafts when the sample task would overwrite them', () => {
    let state = studioReducer(createStudioState(), {
      type: 'edit',
      id: 'search',
      text: '// My custom draft',
    });
    state = finish(
      studioReducer(state, { type: 'task', task: 'fix', text: 'Prepare sample fix.' }),
    );
    expect(state.drafts.search).toBe('// My custom draft');
    expect(state.error).toContain('replace a custom draft');
  });

  it('loads honest fixed test samples and skips arbitrary edited code', () => {
    const original = finish(studioReducer(createStudioState(), { type: 'tests' }));
    expect(original.results.filter((result) => result.state === 'failed')).toHaveLength(2);
    const fixed = finish(studioReducer(prepared(), { type: 'tests' }));
    expect(fixed.results.every((result) => result.state === 'passed')).toBe(true);
    expect(fixed.terminal).toContain('No process or edited code was executed');
    const custom = studioReducer(fixed, {
      type: 'edit',
      id: 'search',
      text: 'throw new Error("Never run this source");',
    });
    expect(custom.testVersion).not.toBe(proposalVersion(custom));
    const skipped = finish(studioReducer(custom, { type: 'tests' }));
    expect(skipped.results.every((result) => result.state === 'skipped')).toBe(true);
    expect(skipped.results[0]?.detail).toContain('never executes edited code');
  });

  it('preserves files through failure/retry, cancellation, and obsolete completion', () => {
    let state = studioReducer(createStudioState(), {
      type: 'task',
      task: 'fix',
      text: 'Fix search.',
      fail: true,
    });
    const failedId = state.operation!.id;
    state = finish(state);
    expect(state.error).toContain('simulated assistant');
    expect(state.sources).toEqual(originalSources);
    state = studioReducer(state, { type: 'task', ...state.lastTask! });
    const retryId = state.operation!.id;
    expect(studioReducer(state, { type: 'finish', id: failedId })).toBe(state);
    state = studioReducer(state, { type: 'cancel' });
    expect(studioReducer(state, { type: 'finish', id: retryId })).toBe(state);
    state = studioReducer(state, { type: 'task', ...state.lastTask! });
    const resetId = state.operation!.id;
    state = studioReducer(state, { type: 'reset' });
    expect(studioReducer(state, { type: 'finish', id: resetId })).toBe(state);
    expect(state.drafts).toEqual(originalSources);
  });

  it('blocks read-only, unknown and oversized edits without evaluating source', () => {
    const original = createStudioState();
    const read = studioReducer(original, { type: 'mode', mode: 'read' });
    expect(studioReducer(read, { type: 'edit', id: 'search', text: 'edited' })).toBe(read);
    expect(studioReducer(original, { type: 'edit', id: 'unknown', text: 'edited' })).toBe(original);
    const oversized = studioReducer(original, {
      type: 'edit',
      id: 'search',
      text: 'x'.repeat(20_001),
    });
    expect(oversized.drafts).toEqual(originalSources);
    expect(oversized.error).toContain('20,000');
  });
  it('binds controlled editor changes to the exact file and draft revision', () => {
    const initial = createStudioState();
    const target = studioDocument(initial, 'search')!;
    const edited = studioReducer(initial, {
      type: 'edit',
      id: 'search',
      target,
      text: '// newer draft',
    });
    expect(edited.drafts.search).toBe('// newer draft');
    const stale = studioReducer(edited, {
      type: 'edit',
      id: 'search',
      target,
      text: '// stale overwrite',
    });
    expect(stale.drafts).toEqual(edited.drafts);
    expect(stale.error).toContain('older draft');
    const wrongFile = studioReducer(initial, {
      type: 'edit',
      id: 'search',
      target: studioDocument(initial, 'tests')!,
      text: '// wrong file',
    });
    expect(wrongFile.drafts).toEqual(initial.drafts);
  });
});
