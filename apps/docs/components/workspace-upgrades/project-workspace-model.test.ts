import { describe, expect, it } from 'vitest';
import {
  createProjectInstructions,
  currentWorkspaceHit,
  projectInstructionCommand,
  projectInstructionReducer,
  searchWorkspaceReferences,
} from './project-workspace-model';

describe('project workspace composition host', () => {
  it('returns literal original-offset versioned hits and excludes denied resources', () => {
    const resources = [
      {
        document: { documentId: 'one', version: '1', path: 'file.ts', text: 'A😀B [value]' },
        access: 'available' as const,
      },
      {
        document: { documentId: 'denied', version: '1', text: '[value]' },
        access: 'denied' as const,
      },
    ];
    const hits = searchWorkspaceReferences('[value]', resources);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.target.range).toEqual({ from: 5, to: 12 });
    expect(currentWorkspaceHit(hits[0]!, resources)).toBe(true);
    expect(
      currentWorkspaceHit(hits[0]!, [
        { ...resources[0]!, document: { ...resources[0]!.document, version: '2' } },
      ]),
    ).toBe(false);
  });
  it('retains drafts after rejected save and ignores repeated immutable commands', () => {
    let state = projectInstructionReducer(createProjectInstructions(), {
      type: 'edit',
      text: 'New instructions',
    });
    state = projectInstructionReducer(state, {
      type: 'configure',
      failNext: true,
      loseAcknowledgement: false,
    });
    const command = projectInstructionCommand(state);
    const action = { type: 'save' as const, command, base: state.document, text: state.draft.text };
    state = projectInstructionReducer(state, action);
    expect(state.draft.text).toBe('New instructions');
    expect(state.document.text).not.toBe('New instructions');
    expect(projectInstructionReducer(state, action)).toBe(state);
  });
  it('resolves unknown acknowledgement by exact lookup without saving again', () => {
    let state = projectInstructionReducer(createProjectInstructions(), {
      type: 'edit',
      text: 'New instructions',
    });
    state = projectInstructionReducer(state, {
      type: 'configure',
      failNext: false,
      loseAcknowledgement: true,
    });
    const command = projectInstructionCommand(state);
    state = projectInstructionReducer(state, {
      type: 'save',
      command,
      base: state.document,
      text: state.draft.text,
    });
    expect(state.state.status).toBe('unknown');
    expect(state.document.text).not.toBe('New instructions');
    expect(projectInstructionReducer(state, { type: 'edit', text: 'Unsafe repeat' })).toBe(state);
    expect(
      projectInstructionReducer(state, {
        type: 'lookup',
        command: { ...command, commandId: 'other' },
      }),
    ).toBe(state);
    state = projectInstructionReducer(state, { type: 'lookup', command });
    expect(state.document.text).toBe('New instructions');
    expect(state.state.status).toBe('settled');
  });
  it('rejects a stale base even if the draft content still matches', () => {
    let state = projectInstructionReducer(createProjectInstructions(), {
      type: 'edit',
      text: 'New instructions',
    });
    const base = state.document;
    const command = projectInstructionCommand(state);
    state = projectInstructionReducer(state, { type: 'external-change' });
    expect(
      projectInstructionReducer(state, {
        type: 'save',
        command: projectInstructionCommand(state),
        base,
        text: state.draft.text,
      }),
    ).toBe(state);
    expect(
      projectInstructionReducer(state, { type: 'save', command, base, text: state.draft.text }),
    ).toBe(state);
  });
});
