/** CodeMirror uses one UTF-16 position for every newline; host snapshots retain original endings. */
export const editorText = (text: string) => text.replace(/\r\n?/g, '\n');
export const lineBoundary = (text: string, offset: number) =>
  !(text[offset - 1] === '\r' && text[offset] === '\n');
export function editorOffset(text: string, offset: number) {
  let removed = 0;
  for (let i = 0; i < offset; i++)
    if (text[i] === '\r' && text[i + 1] === '\n') {
      removed++;
      i++;
    }
  return offset - removed;
}
export function hostOffset(text: string, offset: number) {
  let host = 0;
  for (let editor = 0; editor < offset && host < text.length; editor++)
    host += text[host] === '\r' && text[host + 1] === '\n' ? 2 : 1;
  return host;
}
export const insertedText = (text: string, source: string) =>
  source.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text;
