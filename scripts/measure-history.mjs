import { performance } from 'node:perf_hooks';
import { cpus, platform, arch } from 'node:os';
import { inspectConversationHistory } from '../packages/core/dist/history.js';
function fixture(seed) {
  return Object.freeze({
    context: Object.freeze({
      workspaceId: 'benchmark',
      threadId: 'public',
      snapshotId: String(seed),
      version: '1',
    }),
    messages: Object.freeze(
      Array.from({ length: 10_000 }, (_, i) =>
        Object.freeze({
          id: `${seed}-${i}`,
          role: 'assistant',
          state: 'complete',
          revision: 0,
          text: 'Public fixture response. '.repeat(5),
        }),
      ),
    ),
    older: Object.freeze({ state: 'end' }),
    newer: Object.freeze({ state: 'end' }),
    startIndex: 0,
    totalMessages: 10_000,
  });
}
const cold = [],
  frozenRevision = [],
  cached1000 = [];
for (let i = 0; i < 5; i++) {
  const input = fixture(i);
  let start = performance.now();
  if (!inspectConversationHistory(input)) throw new Error('Fixture rejected.');
  cold.push(performance.now() - start);
  const last = input.messages.at(-1),
    next = Object.freeze({
      ...input,
      context: Object.freeze({ ...input.context, version: '2' }),
      messages: Object.freeze([
        ...input.messages.slice(0, -1),
        Object.freeze({ ...last, revision: 1, text: last.text + 'Updated public result.' }),
      ]),
    });
  start = performance.now();
  if (!inspectConversationHistory(next)) throw new Error('Revision rejected.');
  frozenRevision.push(performance.now() - start);
  start = performance.now();
  for (let j = 0; j < 1000; j++)
    if (!inspectConversationHistory(next)) throw new Error('Cache rejected.');
  cached1000.push(performance.now() - start);
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(
  JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
      },
      fixture: {
        messages: 10_000,
        textUnits: 1_250_000,
        parts: 'legacy plain text',
        samples: 5,
        seed: '0..4',
        allocationIncluded: false,
        gcControlled: false,
      },
      coldParseMs: cold,
      coldMedianMs: median(cold),
      immutableOneRowUpdateMs: frozenRevision,
      updateMedianMs: median(frozenRevision),
      cached1000CallsMs: cached1000,
      cached1000MedianMs: median(cached1000),
      limitations:
        'Synthetic Node validator measurement, not React/browser/provider or arbitrary rich-history performance. Frozen cache applies only after strict validation of deep plain frozen data; mutable rows revalidate.',
    },
    null,
    2,
  ),
);
