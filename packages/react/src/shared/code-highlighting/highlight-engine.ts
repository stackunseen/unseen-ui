import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { CodeToken } from './code-tokens.js';

// Fixed local imports: source labels can never choose a URL/module or custom grammar.
const grammars = {
  javascript: () => import('shiki/langs/javascript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
} as const;
type Language = keyof typeof grammars;
// Marker colours become closed semantic classes, never generated CSS or HTML.
const markers: Record<string, CodeToken['tone']> = {
  '#000001': 'text',
  '#000002': 'comment',
  '#000003': 'keyword',
  '#000004': 'string',
  '#000005': 'constant',
};
const theme = {
  name: 'ai-semantic',
  settings: [
    { settings: { foreground: '#000001', background: '#ffffff' } },
    { scope: ['comment'], settings: { foreground: '#000002', fontStyle: 'italic' } },
    {
      scope: ['keyword', 'storage', 'entity.name', 'support'],
      settings: { foreground: '#000003' },
    },
    { scope: ['string'], settings: { foreground: '#000004' } },
    { scope: ['constant'], settings: { foreground: '#000005' } },
  ],
};
let instance: ReturnType<typeof createHighlighterCore> | undefined;
const loading = new Map<Language, Promise<void>>();
async function highlighter() {
  if (!instance) {
    instance = createHighlighterCore({
      langs: [],
      themes: [theme],
      engine: createJavaScriptRegexEngine(),
    }).catch((error: unknown) => {
      instance = undefined;
      throw error;
    });
  }
  return instance;
}
/** No source cache: only the bounded language set and one semantic theme persist. */
export async function tokenizeCode(code: string, language: Language, current: () => boolean) {
  const engine = await highlighter();
  if (!current()) return undefined;
  if (!engine.getLoadedLanguages().includes(language)) {
    let pending = loading.get(language);
    if (!pending) {
      pending = engine.loadLanguage(grammars[language]()).finally(() => loading.delete(language));
      loading.set(language, pending);
    }
    await pending;
  }
  if (!current()) return undefined;
  const normalized = code.replace(/\r\n/g, '\n');
  const raw = engine.codeToTokens(normalized, { lang: language, theme: 'ai-semantic' }).tokens;
  let count = 0;
  const sourceLines = code.split('\n');
  const lines = raw.map((line, index) => {
    const tokens = line.map((token): CodeToken => {
      if (++count > 10000) throw new Error('Token limit');
      return {
        text: token.content,
        tone: markers[token.color?.toLowerCase() ?? ''] ?? 'text',
        italic: Boolean((token.fontStyle ?? 0) & 1),
      };
    });
    // Preserve original CRLF source in the preview; copying always uses original props.
    if (sourceLines[index]?.endsWith('\r')) tokens.push({ text: '\r', tone: 'text' });
    return tokens;
  });
  if (lines.map((line) => line.map((token) => token.text).join('')).join('\n') !== code)
    throw new Error('Token source mismatch');
  return lines;
}
