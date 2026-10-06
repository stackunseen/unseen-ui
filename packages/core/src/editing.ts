/** A host-issued document/draft revision. A file path alone is not an identity. */
export interface DocumentIdentity {
  readonly documentId: string;
  readonly version: string;
}

/** UTF-16 offsets into the exact revision; `to` is exclusive. */
export interface TextRange {
  readonly from: number;
  readonly to: number;
}

export interface DocumentSnapshot extends DocumentIdentity {
  readonly text: string;
  readonly language?: string;
  readonly path?: string;
}

export interface TextEdit {
  readonly range: TextRange;
  readonly insert: string;
}

export interface VersionedTextTarget extends DocumentIdentity {
  readonly range?: TextRange;
  /** Opaque host-issued content identity; the UI does not invent a digest. */
  readonly digest?: string;
}

export interface EditingCommand {
  readonly commandId: string;
  readonly target: DocumentIdentity;
}

export type EditingReceipt = EditingCommand &
  (
    | { readonly result: 'applied'; readonly nextVersion: string }
    | { readonly result: 'rejected'; readonly reason: string }
  );

export type EditingCommandState =
  | { readonly status: 'idle' }
  | (EditingCommand & { readonly status: 'pending' | 'unknown' })
  | { readonly status: 'settled'; readonly receipt: EditingReceipt };

export function sameDocumentIdentity(a: DocumentIdentity, b: DocumentIdentity): boolean {
  return (
    !!a &&
    !!b &&
    typeof a.documentId === 'string' &&
    typeof a.version === 'string' &&
    !!a.documentId &&
    !!a.version &&
    a.documentId === b.documentId &&
    a.version === b.version
  );
}

function textBoundary(text: string, offset: number): boolean {
  if (offset === 0 || offset === text.length) return true;
  const previous = text.charCodeAt(offset - 1);
  const next = text.charCodeAt(offset);
  return !(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff);
}

export function validTextRange(range: TextRange, text: string): boolean {
  return (
    !!range &&
    typeof text === 'string' &&
    Number.isSafeInteger(range.from) &&
    Number.isSafeInteger(range.to) &&
    range.from >= 0 &&
    range.to >= range.from &&
    range.to <= text.length &&
    textBoundary(text, range.from) &&
    textBoundary(text, range.to)
  );
}

export type TextEditResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: 'stale' | 'invalid' | 'overlapping' | 'too-large' };

/** Bounded fixture/host helper. This does not authorize, execute or persist a command. */
export function applyTextEdits(
  snapshot: DocumentSnapshot,
  target: DocumentIdentity,
  edits: readonly TextEdit[],
  maxCharacters = 100_000,
): TextEditResult {
  if (!sameDocumentIdentity(snapshot, target)) return { ok: false, reason: 'stale' };
  if (
    typeof snapshot.text !== 'string' ||
    !Array.isArray(edits) ||
    !Number.isSafeInteger(maxCharacters) ||
    maxCharacters < 1 ||
    edits.length > 50
  )
    return { ok: false, reason: 'invalid' };
  if (snapshot.text.length > maxCharacters) return { ok: false, reason: 'too-large' };
  if (
    edits.some(
      (edit) =>
        !edit || typeof edit.insert !== 'string' || !validTextRange(edit.range, snapshot.text),
    )
  )
    return { ok: false, reason: 'invalid' };
  const ordered = [...edits].sort((a, b) => a.range.from - b.range.from || a.range.to - b.range.to);
  for (let index = 1; index < ordered.length; index++) {
    const before = ordered[index - 1]!.range;
    const after = ordered[index]!.range;
    if (after.from < before.to || after.from === before.from)
      return { ok: false, reason: 'overlapping' };
  }
  const length = edits.reduce(
    (sum, edit) => sum - (edit.range.to - edit.range.from) + edit.insert.length,
    snapshot.text.length,
  );
  if (length > maxCharacters) return { ok: false, reason: 'too-large' };
  let text = snapshot.text;
  for (const edit of ordered.reverse())
    text = text.slice(0, edit.range.from) + edit.insert + text.slice(edit.range.to);
  return { ok: true, text };
}
