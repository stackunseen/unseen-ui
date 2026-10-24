/** A note with `code` spans, rendered as code instead of showing the backticks. */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(`[^`]+`)/)
        .map((part, index) =>
          part.startsWith('`') && part.endsWith('`') ? (
            <code key={index}>{part.slice(1, -1)}</code>
          ) : (
            part
          ),
        )}
    </>
  );
}
