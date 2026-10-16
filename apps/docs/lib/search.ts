/**
 * Catalog search by meaning: a query matches when every meaningful word, or one of the words it
 * stands for, appears in a component's search text. Filler words are ignored, endings are
 * stripped, intent words expand to the vocabulary the catalog uses, and one typo is forgiven in
 * longer words. It is a small curated vocabulary, not a language model.
 */

const fillers = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'and',
  'or',
  'in',
  'on',
  'with',
  'without',
  'my',
  'me',
  'i',
  'we',
  'it',
  'is',
  'be',
  'that',
  'this',
  'when',
  'before',
  'after',
  'how',
  'do',
  'can',
  'show',
  'shows',
  'showing',
  'display',
  'component',
  'components',
  'ui',
  'some',
  'user',
  'users',
  'want',
  'need',
  'build',
  'make',
  'let',
  'lets',
  'from',
  'into',
  'about',
  'something',
  'thing',
  'up',
  'down',
  'way',
]);

/** Intent words and the catalog words they stand for. Keys and values are stems. */
const intents: Record<string, readonly string[]> = {
  ask: ['approval', 'permission', 'clarification', 'confirm', 'question'],
  approv: ['approval', 'permission', 'review', 'grant'],
  allow: ['approval', 'permission', 'grant', 'scope'],
  permit: ['approval', 'permission', 'grant'],
  consent: ['approval', 'permission', 'grant'],
  confirm: ['approval', 'confirm', 'review'],
  authoriz: ['approval', 'permission', 'grant'],
  authoris: ['approval', 'permission', 'grant'],
  sign: ['approval', 'provenance', 'signed'],
  hitl: ['approval', 'clarification', 'review'],
  human: ['approval', 'clarification', 'review', 'handoff'],
  delet: ['approval', 'dry run', 'remove', 'irreversible'],
  remov: ['remove', 'approval', 'delete'],
  destroy: ['approval', 'dry run', 'irreversible'],
  destructiv: ['approval', 'dry run', 'irreversible'],
  danger: ['approval', 'dry run', 'risk'],
  risk: ['approval', 'risk', 'dry run'],
  undo: ['revert', 'review', 'checkpoint', 'dry run'],
  thumb: ['feedback', 'helpful'],
  rate: ['feedback', 'helpful'],
  rating: ['feedback', 'helpful'],
  like: ['feedback', 'helpful'],
  dislike: ['feedback', 'helpful'],
  feedback: ['feedback', 'helpful'],
  token: ['usage', 'context', 'token'],
  cost: ['usage', 'cost'],
  budget: ['usage', 'cost'],
  spend: ['usage', 'cost'],
  price: ['usage', 'cost', 'pricing'],
  billing: ['usage', 'cost', 'billing'],
  spinner: ['loading', 'progress'],
  loader: ['loading', 'progress', 'skeleton'],
  load: ['loading', 'progress', 'skeleton', 'shimmer'],
  wait: ['loading', 'progress', 'queue', 'waiting'],
  busy: ['loading', 'progress', 'status'],
  dropdown: ['select', 'combobox', 'menu'],
  picker: ['select', 'combobox', 'calendar', 'date'],
  choos: ['select', 'combobox', 'radio', 'choice', 'option'],
  upload: ['attachment', 'dropzone', 'upload', 'file'],
  attach: ['attachment', 'dropzone', 'file'],
  drag: ['dropzone', 'drag', 'sortable'],
  chat: ['chat', 'message', 'conversation', 'prompt'],
  chatbot: ['chat', 'message', 'conversation', 'prompt'],
  bot: ['chat', 'assistant', 'agent'],
  assistant: ['chat', 'assistant', 'message'],
  conversation: ['chat', 'conversation', 'message', 'thread'],
  messag: ['message', 'chat', 'conversation'],
  composer: ['prompt', 'composer', 'input'],
  textbox: ['prompt', 'input', 'textarea'],
  stream: ['streaming', 'shimmer', 'response'],
  typing: ['streaming', 'shimmer', 'response'],
  typewriter: ['streaming', 'response'],
  citat: ['citation', 'source', 'evidence'],
  cite: ['citation', 'source', 'evidence'],
  reference: ['citation', 'source', 'evidence'],
  footnot: ['citation', 'source'],
  ground: ['grounding', 'evidence', 'source'],
  fact: ['evidence', 'grounding', 'source', 'citation'],
  function: ['tool'],
  call: ['tool', 'call'],
  agent: ['agent', 'run', 'steps', 'execution'],
  workflow: ['workflow', 'steps', 'graph', 'plan'],
  pipelin: ['workflow', 'steps', 'execution'],
  plan: ['plan', 'steps', 'task', 'dry run'],
  progress: ['progress', 'steps', 'execution', 'status'],
  background: ['background', 'run', 'queue'],
  job: ['run', 'background', 'queue', 'task'],
  spreadsheet: ['table', 'grid', 'data'],
  row: ['table', 'grid', 'list'],
  graph: ['chart', 'workflow', 'graph'],
  plot: ['chart'],
  visualiz: ['chart', 'graph', 'metric'],
  visualis: ['chart', 'graph', 'metric'],
  stat: ['stat', 'metric', 'chart'],
  kpi: ['stat', 'metric'],
  popup: ['modal', 'dialog', 'popover', 'sheet'],
  dialog: ['modal', 'dialog', 'alert'],
  overlay: ['modal', 'dialog', 'popover', 'sheet', 'tooltip'],
  toast: ['alert', 'toast', 'notice'],
  notif: ['alert', 'toast', 'notice', 'banner'],
  banner: ['alert', 'banner', 'notice'],
  warn: ['alert', 'warning'],
  menu: ['menu', 'command', 'navigation'],
  sidebar: ['sidebar', 'navigation', 'sidecar'],
  nav: ['navigation', 'breadcrumb', 'tabs', 'menu'],
  dark: ['appearance', 'theme'],
  theme: ['appearance', 'theme'],
  diff: ['diff', 'review', 'changes'],
  terminal: ['terminal', 'console'],
  console: ['terminal'],
  snippet: ['code'],
  voic: ['voice', 'audio', 'speech', 'transcription'],
  speech: ['voice', 'speech', 'transcription'],
  microphon: ['voice', 'speech'],
  mic: ['voice', 'speech'],
  audio: ['audio', 'voice'],
  llm: ['model'],
  connector: ['mcp', 'connection', 'integration'],
  integrat: ['mcp', 'integration', 'connection'],
  plugin: ['mcp', 'tool'],
  trust: ['confidence', 'provenance', 'grounding', 'evidence'],
  confidenc: ['confidence', 'grounding'],
  origin: ['provenance'],
  retry: ['retry', 'error', 'recover'],
  error: ['error', 'failed', 'alert', 'retry'],
  fail: ['failed', 'error', 'retry'],
  recover: ['recover', 'retry', 'reconnect'],
  offline: ['connection', 'reconnect'],
  generat: ['generated', 'generative'],
  genui: ['generated', 'generative'],
  dynamic: ['generated', 'generative'],
  date: ['calendar', 'date'],
  time: ['calendar', 'date', 'timeline'],
  schedul: ['calendar', 'routine', 'date'],
  form: ['form', 'field', 'input'],
  validat: ['validation', 'field', 'form'],
  clipboard: ['copy'],
  find: ['search', 'command', 'filter'],
  filter: ['filter', 'search'],
  memory: ['memory', 'context'],
  remember: ['memory', 'context'],
  model: ['model'],
  login: ['form', 'field'],
  setting: ['settings', 'switch', 'form'],
  toggl: ['switch', 'toggle'],
  onoff: ['switch'],
  avatar: ['avatar', 'persona'],
  profil: ['avatar', 'persona'],
  pric: ['pricing', 'usage'],
  landing: ['marketing', 'hero'],
  marketing: ['marketing', 'hero', 'pricing'],
};

/** A crude stem: enough to make "approving", "approved" and "approval" meet. */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const ending of ['ations', 'ation', 'ings', 'ing', 'ers', 'ed', 'es', 'er', 'al', 's', 'e'])
    if (word.endsWith(ending) && word.length - ending.length >= 3)
      return word.slice(0, -ending.length);
  return word;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) {
      // A swapped pair counts as one edit.
      i += 2;
      j += 2;
    } else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** The meaningful words of a query, each with the words that satisfy it. */
export function queryWords(query: string): string[][] {
  return words(query)
    .filter((word) => !fillers.has(word))
    .map((word) => {
      const base = stem(word);
      return [...new Set([word, base, ...(intents[base] ?? intents[word] ?? [])])];
    });
}

/** True when every meaningful word of the query is found in the search text. */
export function matchesQuery(searchText: string, query: string): boolean {
  const needed = queryWords(query);
  if (!needed.length) return true;
  const text = searchText.toLowerCase();
  let vocabulary: string[] | undefined;
  return needed.every((alternatives) =>
    alternatives.some((alternative) => {
      if (text.includes(alternative)) return true;
      if (alternative.length < 5) return false;
      vocabulary ??= [...new Set(words(text))];
      return vocabulary.some(
        (word) => withinOneEdit(word, alternative) || withinOneEdit(stem(word), alternative),
      );
    }),
  );
}
