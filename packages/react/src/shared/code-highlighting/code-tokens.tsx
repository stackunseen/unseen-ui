import s from './code-tokens.module.css';
export interface CodeToken {
  text: string;
  tone: 'text' | 'comment' | 'keyword' | 'string' | 'constant';
  italic?: boolean;
}
/** Internal, closed token presentation shared by code blocks and diffs. */
export function CodeTokenLine({ tokens }: { tokens: readonly CodeToken[] }) {
  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={index}
          data-code-token={token.tone}
          className={`${s[token.tone]}${token.italic ? ` ${s.italic}` : ''}`}
        >
          {token.text}
        </span>
      ))}
    </>
  );
}
