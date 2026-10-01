'use client';
import { CodeDiff } from '../code-diff/code-diff.js';
import type { CodeDiffProps, CodeDiffLine } from '../code-diff/code-diff.js';
import { CodeTokenLine } from '../../shared/code-highlighting/code-tokens.js';
import { useCodeHighlight } from '../../shared/code-highlighting/use-code-highlight.js';
import s from '../../shared/styles/coding.module.css';
export interface HighlightedCodeDiffProps extends Omit<CodeDiffProps, 'renderLine'> {
  language?: string;
  highlight?: boolean;
}
export function HighlightedCodeDiff({
  language,
  highlight = true,
  ...props
}: HighlightedCodeDiffProps) {
  const valid =
    Boolean(props.baseVersion.trim() && props.nextVersion.trim()) &&
    (props.baseVersion !== props.nextVersion || props.before === props.after);
  const ready =
    (props.status ?? 'ready') === 'ready' &&
    valid &&
    props.before.length + props.after.length <= 60000;
  const visible = ready && props.before !== props.after;
  const revision = JSON.stringify([props.path, props.baseVersion, props.nextVersion]);
  const before = useCodeHighlight({
    code: props.before,
    language,
    highlight: highlight && visible,
    revision,
  });
  const after = useCodeHighlight({
    code: props.after,
    language,
    highlight: highlight && visible,
    revision,
  });
  const complete =
    visible &&
    highlight &&
    [before.state, after.state].some((state) => state === 'highlighted') &&
    [before.state, after.state].every((state) => state === 'highlighted' || state === 'plain');
  const notice = visible && highlight ? (before.notice ?? after.notice) : undefined;
  function renderLine(line: CodeDiffLine) {
    const number = line.side === 'before' ? line.beforeLine : line.afterLine;
    const tokens = number
      ? (line.side === 'before' ? before.lines : after.lines)?.[number - 1]
      : undefined;
    return complete && tokens && tokens.map((token) => token.text).join('') === line.text ? (
      <CodeTokenLine tokens={tokens} />
    ) : (
      line.text || ' '
    );
  }
  return (
    <div
      className={s.root}
      data-part="highlighted-code-diff"
      data-highlighting={
        complete
          ? 'highlighted'
          : !visible || !highlight
            ? 'plain'
            : notice
              ? 'fallback'
              : 'loading'
      }
    >
      <CodeDiff {...props} renderLine={renderLine} />
      {notice && (
        <p className={s.muted} data-part="highlight-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
