const entries = [
  ['/theme, /status, /code', 'None', 'None'],
  ['/markdown', 'react-markdown, remark-gfm, remend', 'None'],
  ['/math', 'katex', 'katex/dist/katex.min.css'],
  ['/mermaid', 'mermaid, dompurify', 'KaTeX CSS for math labels'],
  [
    '/rich-markdown',
    'Markdown peers, remark-math, katex, mermaid, dompurify',
    'katex/dist/katex.min.css',
  ],
  ['/highlight', 'shiki', 'None'],
  ['/terminal', '@xterm/xterm, @xterm/addon-fit', '@stackunseen/ui/terminal.css'],
  ['/viewport', '@tanstack/react-virtual', 'None'],
  ['/layout', 'react-resizable-panels', 'None'],
  ['/sidecar, /workspace, /upload', 'None', 'None'],
] as const;

export function OptionalEntries() {
  return (
    <div
      className="setup-entry-table"
      role="region"
      aria-label="Optional entry requirements"
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">Optional @stackunseen/ui entry requirements</caption>
        <thead>
          <tr>
            <th scope="col">Entry</th>
            <th scope="col">Additional peers</th>
            <th scope="col">Extra CSS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([entry, peers, css]) => (
            <tr key={entry}>
              <th scope="row">
                <code>{entry}</code>
              </th>
              <td>{peers}</td>
              <td>{css}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
