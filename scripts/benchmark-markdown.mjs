import { performance } from 'node:perf_hooks';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownResponse } from '../packages/react/dist/markdown.js';

const sample =
  '# Result\n\nA **formatted** answer with `code` and a [reference](https://example.com).\n\n- Review the record\n- Confirm the owner\n\n';
const cases = [1000, 10000, 50000, 100000, 100001].map((size) => ({
  name: `prose-${size}`,
  text: sample.repeat(Math.ceil(size / sample.length)).slice(0, size),
}));
cases.push({ name: 'unmatched-delimiters', text: '[**x '.repeat(15000) });
const metrics = [];
for (const fixture of cases) {
  const times = [];
  let outputBytes = 0;
  for (let iteration = 0; iteration < 6; iteration++) {
    const start = performance.now();
    const html = renderToString(
      createElement(MarkdownResponse, { text: fixture.text, state: 'streaming' }),
    );
    const elapsed = performance.now() - start;
    outputBytes = Buffer.byteLength(html);
    if (iteration > 0) times.push(elapsed);
  }
  times.sort((a, b) => a - b);
  metrics.push({
    fixture: fixture.name,
    characters: fixture.text.length,
    medianMs: Number(times[2].toFixed(2)),
    maxMs: Number(times[4].toFixed(2)),
    outputBytes,
  });
}
console.log(
  JSON.stringify(
    {
      environment: { node: process.version, platform: process.platform },
      methodology:
        'React server render, streaming state; one warmup and five measured renders. Not a browser responsiveness claim.',
      metrics,
    },
    null,
    2,
  ),
);
