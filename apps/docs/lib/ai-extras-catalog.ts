import type { CatalogEntry } from './catalog';

type Entry = Omit<CatalogEntry, 'presentations' | 'presentationProp' | 'importPath' | 'group'>;
const optional =
  (importPath: '/assistant' | '/devtools' | '/media') =>
  (entry: Entry): CatalogEntry => ({
    ...entry,
    group: 'AI Components',
    presentations: ['default'],
    presentationProp: null,
    importPath,
  });
const assistant = optional('/assistant');
const devtools = optional('/devtools');
const media = optional('/media');

export const aiExtrasCatalog: CatalogEntry[] = [
  assistant({
    name: 'Reasoning',
    category: 'Conversation',
    aliases: ['Thinking', 'Reasoning summary'],
    description: 'A quiet, collapsible public reasoning summary that follows the stream.',
    states: ['Complete', 'Streaming', 'Unknown duration'],
    contract: 'summary · state · durationMs? · open? · onOpenChange?',
    responsibility:
      'Pass only a public summary, never private reasoning. The duration shows only if your server measured it.',
    code: '<Reasoning summary={summary} state="complete" durationMs={3200} />',
  }),
  assistant({
    name: 'SuggestTextarea',
    category: 'Conversation',
    aliases: ['AI autocomplete', 'Ghost text', 'Copilot textarea', 'Inline completion'],
    description: 'A text area that shows an AI completion as ghost text; Tab accepts it.',
    states: ['Suggesting', 'No suggestion'],
    contract: 'value · onValueChange · suggestion? · onAccept? · onDismiss? · Textarea props',
    responsibility:
      'Fetch suggestions yourself, for the current text only, and clear them when the text changes or after Escape. The component never calls a model.',
    keyboard:
      'Tab accepts and Escape dismisses only while a suggestion shows at the end of the text; otherwise both keep their usual behavior. Screen readers hear the suggestion as a description.',
    code: '<SuggestTextarea value={draft} onValueChange={setDraft} suggestion={completion} />',
  }),
  assistant({
    name: 'WorkSummary',
    category: 'Execution',
    aliases: ['Worked for', 'Turn activity', 'Agent activity'],
    description:
      'The steps of one agent turn, open while it works and collapsed to "Worked for 15s" after.',
    states: ['Running', 'Done', 'Stopped', 'Failed'],
    contract:
      'steps · state: running | done | stopped | failed · startedAt · endedAt? · durationMs? · children? · open? · onOpenChange?',
    responsibility:
      'Steps and times come from your server. Pass endedAt or durationMs when the turn ends; otherwise the clock stops when the state changes.',
    code: '<WorkSummary steps={turn.steps} state="done" startedAt={turn.startedAt} durationMs={turn.elapsedMs} />',
  }),
  assistant({
    name: 'ChainOfThought',
    category: 'Execution',
    aliases: ['Agent steps', 'Thought steps', 'Task log', 'Activity log'],
    description: 'The public steps a run took, each with its sources or files.',
    states: ['Default', 'Active step', 'Task log', 'Failed step', 'Empty'],
    contract: 'steps · title? · open? · onOpenChange?',
    responsibility:
      'Report only steps that really happened. Source links show only for http and https addresses.',
    code: '<ChainOfThought steps={steps} />',
  }),
  assistant({
    name: 'Plan',
    category: 'Execution',
    aliases: ['Execution plan'],
    description: 'A proposed plan with collapsible steps and a button to run it.',
    states: ['Default', 'In progress', 'Failed step', 'Streaming', 'Without steps'],
    contract: 'title · description? · steps? (state, detail) · streaming? · actions? · labels?',
    responsibility:
      'Showing a plan doesn’t approve or start it. Run it only after your server has checked it.',
    code: '<Plan title="Rewrite the docs" steps={steps} actions={<Button>Build</Button>} />',
  }),
  assistant({
    name: 'Checkpoint',
    category: 'Conversation',
    aliases: ['Restore point'],
    description: 'A divider marking a restorable point in a conversation.',
    states: ['Default', 'Restoring'],
    contract: 'label? · createdAt? · onRestore? · restoring?',
    responsibility:
      'Restore asks your app to go back to this point; your app does it and reports what happened.',
    code: '<Checkpoint createdAt={time} onRestore={restore} />',
  }),
  assistant({
    name: 'Sources',
    category: 'Sources & evidence',
    aliases: ['Used sources', 'Source list'],
    description: 'A "Used N sources" disclosure with safe links.',
    states: ['Collapsed', 'Expanded', 'Empty'],
    contract: 'sources · open? · onOpenChange?',
    responsibility: 'Listing a source does not claim it supports the answer.',
    code: '<Sources sources={sources} />',
  }),
  assistant({
    name: 'ModelSelector',
    category: 'Model controls',
    aliases: ['Model picker'],
    description:
      'A compact model picker: each model with its description, and a check on the current one.',
    states: ['Default', 'Unavailable model'],
    contract: 'models · value · onValueChange · label? · disabled?',
    responsibility: 'Check the chosen model on your server when the request runs.',
    keyboard: 'Enter opens the list; arrow keys move between models; Escape closes.',
    code: '<ModelSelector models={models} value={model} onValueChange={setModel} />',
  }),
  devtools({
    name: 'CodeTabs',
    category: 'Coding workspace',
    aliases: ['Code viewer', 'File tabs', 'Code tour'],
    description: 'A code viewer for the files of one example, with optional numbered tour stops.',
    states: ['Default', 'With tour', 'Single file'],
    contract:
      'files: { file, language, code, label? }[] · label · value? · onValueChange? · tour?: { file, start, end, title, note }[] · stop? · onStopChange? · hashLinks? · copy? · codeBlock?',
    responsibility:
      'Files are keyed by name. A stop selects its file, marks its lines and scrolls the first one into view inside the pane, never the page; #tour-n links open their stop. Pass HighlightedCodeBlock as codeBlock for tokens; the plain block is the default.',
    keyboard:
      'The file list is a tablist with arrow keys, Home and End. Stop buttons carry aria-current="step" and the open stop is announced in a polite live region.',
    code: '<CodeTabs files={files} label="Example files" tour={tour} hashLinks="tour-" copy />',
  }),
  devtools({
    name: 'Snippet',
    category: 'Coding workspace',
    aliases: ['Command', 'Install command'],
    description: 'A single command with a copy button.',
    states: ['Default'],
    contract: 'code · prefix? · label?',
    responsibility: 'Shown as text; it never runs.',
    code: '<Snippet prefix="$" code="pnpm add @stackunseen/ui" />',
  }),
  devtools({
    name: 'Commit',
    category: 'Coding workspace',
    aliases: ['Git commit'],
    description: 'A commit with its subject, author and changed files.',
    states: ['Default', 'Files open'],
    contract: 'hash · message · author? · committedAt? · files?',
    responsibility: 'Shows the commit data you pass in; it never runs git.',
    code: '<Commit hash={hash} message={message} files={files} />',
  }),
  devtools({
    name: 'EnvironmentVariables',
    category: 'Coding workspace',
    aliases: ['Env vars', 'Secrets'],
    description: 'Environment variables with masked secret values.',
    states: ['Default', 'Empty'],
    contract: 'variables · title?',
    responsibility:
      'Leave secret values out when you can. Reveal only shows what you passed in; it never fetches anything.',
    code: '<EnvironmentVariables variables={variables} />',
  }),
  devtools({
    name: 'PackageInfo',
    category: 'Coding workspace',
    aliases: ['Dependency change'],
    description: 'A package change with versions and dependencies.',
    states: ['Major', 'Added'],
    contract: 'name · currentVersion? · newVersion? · changeType? · dependencies?',
    responsibility: 'It doesn’t install or check anything.',
    code: '<PackageInfo name="react" currentVersion="18.3.1" newVersion="19.0.0" changeType="major" />',
  }),
  devtools({
    name: 'SchemaDisplay',
    category: 'Coding workspace',
    aliases: ['API schema', 'Endpoint'],
    description: 'An API operation with parameters and nested bodies.',
    states: ['Default'],
    contract: 'method · path · parameters? · requestBody? · responseBody?',
    responsibility: 'Read-only; it never sends a request.',
    code: '<SchemaDisplay method="POST" path="/accounts" requestBody={fields} />',
  }),
  devtools({
    name: 'StackTrace',
    category: 'Coding workspace',
    aliases: ['Error stack'],
    description: 'A readable error with internal frames collapsed.',
    states: ['Default'],
    contract: 'name · message · frames · onOpenFrame?',
    responsibility: 'Opening a frame asks your app to jump to that line in an editor.',
    code: '<StackTrace name="TypeError" message={message} frames={frames} />',
  }),
  devtools({
    name: 'WebPreview',
    category: 'Artifacts',
    aliases: ['Browser preview', 'Iframe preview'],
    description: 'A sandboxed preview of a web page, with an address bar.',
    states: ['Default', 'Failed', 'Unavailable', 'Unsafe address'],
    contract: 'url · title? · onNavigate? · status? · error? · onReload? · labels?',
    responsibility:
      'The page never gets access to your site, and you decide which addresses may load.',
    code: '<WebPreview url={previewUrl} onNavigate={setPreviewUrl} />',
  }),
  media({
    name: 'AudioPlayer',
    category: 'Voice',
    aliases: ['Audio'],
    description: 'A compact player for generated or recorded audio.',
    states: ['Default', 'Unavailable'],
    contract: 'src · label',
    responsibility: 'Pass audio the person is allowed to play. Unsafe sources are refused.',
    code: '<AudioPlayer src={audioUrl} label="Answer audio" />',
  }),
  media({
    name: 'Transcription',
    category: 'Voice',
    aliases: ['Transcript'],
    description: 'A timed transcript that follows playback and can seek.',
    states: ['Default', 'Transcribing', 'Unavailable', 'Empty'],
    contract: 'segments · currentTime? · onSeek? · follow? · status?',
    responsibility: 'Timings and text come from the transcription provider.',
    code: '<Transcription segments={segments} currentTime={time} onSeek={seek} />',
  }),
  media({
    name: 'VoiceSelector',
    category: 'Voice',
    aliases: ['Voice picker'],
    description: 'Choose a speech voice and preview samples.',
    states: ['Default'],
    contract: 'voices · value · onValueChange · onPreview?',
    responsibility: 'Your app plays the samples and applies the chosen voice.',
    code: '<VoiceSelector voices={voices} value={voice} onValueChange={setVoice} />',
  }),
  media({
    name: 'Persona',
    category: 'Voice',
    aliases: ['Voice orb', 'Agent avatar'],
    description: 'An animated presence for voice agents.',
    states: ['Idle', 'Listening', 'Thinking', 'Speaking', 'Asleep'],
    contract: 'state · name? · size? · showLabel?',
    responsibility:
      'Pass what your voice agent is doing. Motion follows the reduced-motion setting.',
    code: '<Persona state="listening" />',
  }),
  media({
    name: 'Image',
    category: 'Artifacts',
    aliases: ['Generated image'],
    description: 'A generated or attached image, with what to show while it loads or if it fails.',
    states: ['Ready', 'Queued', 'Loading', 'Generating with progress', 'Failed', 'Unavailable'],
    contract:
      'src | base64 + mediaType · alt · caption? · state?: queued | loading | ready | failed · progress? · preview? · error? · onRetry?',
    responsibility:
      'Alt text is required. Progress shows only if your server measured it, and a partial preview is treated as decoration. SVG data and unsafe links are refused.',
    code: '<Image src={url} alt="Weekly signups chart" />',
  }),
];

export const aiExtrasNames = new Set<string>(aiExtrasCatalog.map((entry) => entry.name));
