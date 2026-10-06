import type { DocumentSnapshot } from '@stackunseen/ui-core/editing';
import type { ReferenceOption } from '@stackunseen/ui';

/** Shared content for the independent, in-memory workspace examples. */
export const queryDocument: DocumentSnapshot = {
  documentId: 'query',
  version: 'query-1',
  path: 'src/query.ts',
  language: 'typescript',
  text: 'const limit = 10;\nconst order = "desc";\n',
};
export const queryDraftText = 'const limit = 20;\nconst order = "asc";\n';
export const queryQuestion = 'Increase the result limit to 20 and sort results ascending.';
export const queryAnswer =
  'The proposal updates the result limit and ordering. Review the exact changes before applying them.';
export const queryReference: ReferenceOption = {
  id: 'query-limit',
  kind: 'symbol',
  label: 'query.ts: result limit',
  description: 'Result limit in the original query file',
  version: 'query-1',
  target: { documentId: 'query', version: 'query-1', range: { from: 14, to: 16 } },
  resource: queryDocument,
};
