import { describe, expect, it } from 'vitest';
import { applyTextEdits, sameDocumentIdentity, validTextRange } from '../src/editing.js';

const document = { documentId: 'file:one', version: 'draft:1', text: 'abcdef' };

describe('revision-bound text editing', () => {
  it('applies nonoverlapping edits atomically against original offsets', () => {
    expect(
      applyTextEdits(document, document, [
        { range: { from: 4, to: 6 }, insert: 'Z' },
        { range: { from: 1, to: 3 }, insert: 'XY' },
      ]),
    ).toEqual({ ok: true, text: 'aXYdZ' });
    expect(document.text).toBe('abcdef');
  });

  it('does not apply a stale revision or a different document', () => {
    expect(applyTextEdits(document, { ...document, version: 'draft:2' }, [])).toEqual({
      ok: false,
      reason: 'stale',
    });
    expect(sameDocumentIdentity(document, { ...document, documentId: 'file:two' })).toBe(false);
  });

  it('rejects overlapping edits and ambiguous insertions at one position', () => {
    expect(
      applyTextEdits(document, document, [
        { range: { from: 1, to: 3 }, insert: '' },
        { range: { from: 2, to: 4 }, insert: '' },
      ]),
    ).toEqual({ ok: false, reason: 'overlapping' });
    expect(
      applyTextEdits(document, document, [
        { range: { from: 1, to: 1 }, insert: 'A' },
        { range: { from: 1, to: 1 }, insert: 'B' },
      ]),
    ).toEqual({ ok: false, reason: 'overlapping' });
  });

  it('rejects out-of-bounds, fractional and split-surrogate targets', () => {
    for (const range of [
      { from: -1, to: 1 },
      { from: 1, to: 7 },
      { from: 2, to: 1 },
      { from: 0.5, to: 1 },
    ])
      expect(validTextRange(range, document.text)).toBe(false);
    expect(validTextRange({ from: 1, to: 2 }, 'A😀B')).toBe(false);
    expect(validTextRange({ from: 1, to: 3 }, 'A😀B')).toBe(true);
  });

  it('enforces resulting-content and edit-count bounds before applying', () => {
    expect(
      applyTextEdits(document, document, [{ range: { from: 0, to: 0 }, insert: 'more' }], 6),
    ).toEqual({
      ok: false,
      reason: 'too-large',
    });
    expect(
      applyTextEdits(
        document,
        document,
        Array.from({ length: 51 }, () => ({ range: { from: 0, to: 0 }, insert: '' })),
      ),
    ).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
