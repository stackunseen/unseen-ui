import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile, copyFile, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const root = process.cwd();
const pm = process.env.npm_execpath;
if (!pm) throw new Error('Run this script through pnpm check:packages.');
const log = [];
function run(args, cwd = root) {
  // Reuse an already populated store when registry access is slow; missing
  // dependencies still fail rather than silently widening the test fixture.
  if (process.env.AI_COMPONENTS_PACKAGE_CHECK_OFFLINE === '1' && args[0] === 'install')
    args = [...args, '--offline'];
  const result = spawnSync(process.execPath, [pm, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    maxBuffer: 10_000_000,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  log.push(`$ pnpm ${args.join(' ')}\n${output}`);
  process.stdout.write(output);
  if (result.status !== 0)
    throw new Error(`Package check command failed (${result.status}): ${args.join(' ')}`);
}
await mkdir('output/packages', { recursive: true });
const outputDir = resolve('output/packages');
try {
  for (const name of ['core', 'react'])
    run(['--dir', `packages/${name}`, 'pack', '--pack-destination', outputDir]);
  const tarballs = (await readdir(outputDir)).filter((f) => f.endsWith('.tgz'));
  const core = resolve(
    outputDir,
    tarballs.find((f) => f.startsWith('ai-interaction-core-')),
  );
  const react = resolve(
    outputDir,
    tarballs.find((f) => f.startsWith('ai-interaction-react-')),
  );
  const stage = await mkdtemp(join(tmpdir(), 'ai-interaction-packed-'));
  console.log(`Isolated consumers: ${stage}`);
  log.push(`Isolated consumers: ${stage}`);
  const rootPkg = JSON.parse(await readFile('package.json', 'utf8'));
  const docsPkg = JSON.parse(await readFile('apps/docs/package.json', 'utf8'));
  await writeFile(
    join(stage, 'package.json'),
    JSON.stringify(
      {
        name: 'packed-consumers',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: {
          '@ai-interaction/core': `file:${core}`,
          '@ai-interaction/react': `file:${react}`,
          react: rootPkg.devDependencies.react,
          'react-dom': rootPkg.devDependencies['react-dom'],
          next: docsPkg.dependencies.next,
          'react-markdown': rootPkg.devDependencies['react-markdown'],
          'remark-gfm': rootPkg.devDependencies['remark-gfm'],
          remend: rootPkg.devDependencies.remend,
          ...Object.fromEntries(
            [
              'mermaid',
              'katex',
              'dompurify',
              'remark-math',
              'shiki',
              '@xterm/xterm',
              '@xterm/addon-fit',
              '@tanstack/react-virtual',
              'react-resizable-panels',
            ].map((key) => [key, docsPkg.dependencies[key]]),
          ),
        },
        devDependencies: Object.fromEntries(
          [
            'vite',
            '@vitejs/plugin-react',
            'typescript',
            '@types/react',
            '@types/react-dom',
            '@types/node',
          ].map((key) => [key, rootPkg.devDependencies[key]]),
        ),
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(stage, 'pnpm-workspace.yaml'),
    `packages: []\nallowBuilds:\n  esbuild: true\nstrictPeerDependencies: true\noverrides:\n  '@ai-interaction/core': ${JSON.stringify(`file:${core.replaceAll('\\', '/')}`)}\n`,
  );
  await mkdir(join(stage, 'src'));
  // The consumer has two HTML entries. Exercise Relay against the packed public packages too.
  await copyFile('examples/consumer/relay.html', join(stage, 'relay.html'));
  await cp('examples/consumer/src/relay', join(stage, 'src', 'relay'), {
    recursive: true,
    filter: (source) => !/\.test\.[jt]sx?$/.test(source),
  });
  await mkdir(join(stage, 'app'));
  for (const folder of ['src', 'app']) {
    await copyFile(
      'tests/fixtures/website-public-example.tsx',
      join(stage, folder, 'website-public-example.tsx'),
    );
    for (const file of [
      'viewport-example.tsx',
      'viewport-example.module.css',
      'workspace-example.tsx',
      'workspace-example.module.css',
      'recovery-example.tsx',
      'recovery-example.module.css',
      'recovery-host.ts',
      'upload-example.tsx',
      'upload-example.module.css',
    ])
      await copyFile(`examples/consumer/src/${file}`, join(stage, folder, file));
    await mkdir(join(stage, folder, 'upload-host'));
    await copyFile(
      'examples/consumer/src/upload-host/client.ts',
      join(stage, folder, 'upload-host/client.ts'),
    );
    await mkdir(join(stage, folder, 'conversation-host'));
    for (const file of ['conversation-example.tsx', 'conversation-example.module.css', 'css.d.ts'])
      await copyFile(`examples/consumer/src/${file}`, join(stage, folder, file));
    for (const file of ['host.ts', 'store.ts'])
      await copyFile(
        `examples/consumer/src/conversation-host/${file}`,
        join(stage, folder, 'conversation-host', file),
      );
    await mkdir(join(stage, folder, 'voice-host'));
    const voice = await readFile('examples/consumer/src/voice-example.tsx', 'utf8');
    await writeFile(join(stage, folder, 'voice-example.tsx'), voice);
    for (const file of ['host.ts', 'platform.ts'])
      await copyFile(
        `examples/consumer/src/voice-host/${file}`,
        join(stage, folder, 'voice-host', file),
      );
  }
  await copyFile('examples/consumer/src/main.tsx', join(stage, 'src/main.tsx'));
  await copyFile('examples/consumer/src/form-example.tsx', join(stage, 'src/form-example.tsx'));
  await copyFile('examples/consumer/src/form-example.tsx', join(stage, 'app/form-example.tsx'));
  await copyFile('examples/consumer/src/chart-example.tsx', join(stage, 'src/chart-example.tsx'));
  await copyFile('examples/consumer/src/chart-example.tsx', join(stage, 'app/chart-example.tsx'));
  await copyFile('examples/consumer/src/file-example.tsx', join(stage, 'src/file-example.tsx'));
  await copyFile('examples/consumer/src/file-example.tsx', join(stage, 'app/file-example.tsx'));
  await copyFile(
    'examples/consumer/src/terminal-example.tsx',
    join(stage, 'src/terminal-example.tsx'),
  );
  await copyFile(
    'examples/consumer/src/terminal-example.tsx',
    join(stage, 'app/terminal-example.tsx'),
  );
  await copyFile(
    'examples/consumer/src/workflow-example.tsx',
    join(stage, 'src/workflow-example.tsx'),
  );
  await copyFile(
    'examples/consumer/src/workflow-example.tsx',
    join(stage, 'app/workflow-example.tsx'),
  );
  await copyFile(
    'examples/consumer/src/generated-example.tsx',
    join(stage, 'src/generated-example.tsx'),
  );
  await copyFile(
    'examples/consumer/src/generated-example.tsx',
    join(stage, 'app/generated-example.tsx'),
  );
  await copyFile('examples/consumer/index.html', join(stage, 'index.html'));
  await copyFile('examples/consumer/vite.config.ts', join(stage, 'vite.config.ts'));
  const tsconfig = JSON.parse(await readFile('tsconfig.json', 'utf8'));
  tsconfig.compilerOptions.noEmit = true;
  tsconfig.include = ['src', 'app'];
  await writeFile(join(stage, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  await writeFile(
    join(stage, 'next.config.mjs'),
    "export default { output: 'export', devIndicators: false };\n",
  );
  await writeFile(
    join(stage, 'app/layout.tsx'),
    "import type { ReactNode } from 'react';\nimport '@ai-interaction/react/styles.css';\nexport default function Layout({children}:{children:ReactNode}){return <html lang=\"en\"><body>{children}</body></html>;}\n",
  );
  await writeFile(
    join(stage, 'app/page.tsx'),
    "import { StatusBadge, AITheme } from '@ai-interaction/react';\nimport { MarkdownResponse } from '@ai-interaction/react/markdown';\nimport { createTheme } from '@ai-interaction/react/theme';\nimport { canTransition } from '@ai-interaction/core';\nexport default function Page(){const theme=createTheme({primary:'#166534'});return <AITheme theme={theme}><h1>Packed Next consumer</h1><StatusBadge state={canTransition('queued','running')?'running':'unknown'}/><MarkdownResponse headingLevel={2} text={'# Rich response\\n\\nA **formatted** server-rendered example.'} state=\"complete\" /></AITheme>;}\n",
  );
  await writeFile(
    join(stage, 'app/rich-example.tsx'),
    `
'use client';
import { RichMarkdownResponse, MathFormula, MermaidDiagram } from '@ai-interaction/react/rich-markdown';
import { HighlightedCodeBlock, HighlightedCodeDiff } from '@ai-interaction/react/highlight';
import 'katex/dist/katex.min.css';
export function RichExample() { return <><MathFormula formula={'x^2 + y^2 = z^2'} /><MermaidDiagram title="Packed diagram" code={'flowchart LR\\n A-->B'} /><HighlightedCodeBlock code={'const value = 1;'} language="ts" variant="numbered"/><HighlightedCodeDiff path="a.ts" before="const value = 1;" after="const value = 2;" baseVersion="v1" nextVersion="v2" language="ts" variant="split"/><RichMarkdownResponse text={'A formula: $x^2$.'} state="complete" renderCodeBlock={(props)=><HighlightedCodeBlock {...props}/>} /></>; }
`,
  );
  const pageSource = await readFile(join(stage, 'app/page.tsx'), 'utf8');
  await writeFile(
    join(stage, 'app/page.tsx'),
    "import {WebsitePublicExample} from './website-public-example';\nimport {UploadExample} from './upload-example';\nimport {RecoveryExample} from './recovery-example';\nimport {WorkspaceExample} from './workspace-example';\nimport {ViewportExample} from './viewport-example';\nimport {ConversationExample} from './conversation-example';\nimport {VoiceExample} from './voice-example';\nimport {RichExample} from './rich-example';\nimport {FormExample} from './form-example';\nimport {GeneratedExample} from './generated-example';\nimport {ChartExample} from './chart-example';\nimport {WorkflowExample} from './workflow-example';\nimport {FileExample} from './file-example';\nimport {TerminalExample} from './terminal-example';\n" +
      pageSource.replace(
        '</AITheme>',
        '<WebsitePublicExample /><UploadExample /><RecoveryExample /><WorkspaceExample /><ViewportExample /><ConversationExample /><VoiceExample /><FormExample /><GeneratedExample /><ChartExample /><WorkflowExample /><FileExample /><TerminalExample /><RichExample /></AITheme>',
      ),
  );
  run(['install'], stage);
  run(['exec', 'tsc', '--noEmit'], stage);
  run(['exec', 'vite', 'build'], stage);
  run(['exec', 'next', 'build', '--webpack'], stage);
  run(
    [
      'exec',
      'node',
      '--input-type=module',
      '-e',
      "const rich=await import('@ai-interaction/react/rich-markdown'); const math=await import('@ai-interaction/react/math'); const diagram=await import('@ai-interaction/react/mermaid'); const plain=await import('@ai-interaction/react/code'); const markdown=await import('@ai-interaction/react/markdown'); if(plain.MarkdownCodeBlock!==markdown.MarkdownCodeBlock) throw new Error('Plain code exports diverged'); if(rich.MathFormula!==math.MathFormula || rich.MermaidDiagram!==diagram.MermaidDiagram) throw new Error('Aggregate renderer exports diverged'); console.log('PASS: aggregate and independent entries share renderer identities.');",
    ],
    stage,
  );
  const baseStage = await mkdtemp(join(tmpdir(), 'ai-interaction-base-only-'));
  await writeFile(
    join(baseStage, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies: {
          '@ai-interaction/core': `file:${core}`,
          '@ai-interaction/react': `file:${react}`,
          react: rootPkg.devDependencies.react,
          'react-dom': rootPkg.devDependencies['react-dom'],
        },
        devDependencies: {
          vite: rootPkg.devDependencies.vite,
          '@vitejs/plugin-react': rootPkg.devDependencies['@vitejs/plugin-react'],
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(baseStage, 'pnpm-workspace.yaml'),
    `packages: []\nallowBuilds:\n  esbuild: true\nstrictPeerDependencies: true\noverrides:\n  '@ai-interaction/core': ${JSON.stringify(`file:${core.replaceAll('\\', '/')}`)}\n`,
  );
  await writeFile(
    join(baseStage, 'index.html'),
    '<html lang="en"><head><title>Base entry</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  await writeFile(
    join(baseStage, 'main.tsx'),
    "import {createRoot} from 'react-dom/client';\nimport {WebsitePublicExample} from './website-public-example';\nimport {Message,StatusBadge,IconButton} from '@ai-interaction/react';\nimport type {IconButtonProps} from '@ai-interaction/react';\nimport '@ai-interaction/react/styles.css';\nconst action:IconButtonProps={label:'Archive sample conversation',icon:'archive',disabled:true};\ncreateRoot(document.getElementById('root')!).render(<><StatusBadge state=\"running\"/><IconButton {...action}/><Message value={{id:'base',role:'assistant',text:'Plain text without optional parsers',state:'complete',revision:1}}/><WebsitePublicExample/></>);\n",
  );
  await copyFile(
    'tests/fixtures/website-public-example.tsx',
    join(baseStage, 'website-public-example.tsx'),
  );
  await copyFile('examples/consumer/vite.config.ts', join(baseStage, 'vite.config.ts'));
  await copyFile('examples/consumer/relay.html', join(baseStage, 'relay.html'));
  await cp('examples/consumer/src/relay', join(baseStage, 'src', 'relay'), {
    recursive: true,
    filter: (source) => !/\.test\.[jt]sx?$/.test(source),
  });
  run(['install'], baseStage);
  run(
    [
      'exec',
      'node',
      '--input-type=module',
      '-e',
      "for (const name of ['react-markdown','remark-gfm','remend','mermaid','katex','dompurify','remark-math','shiki','@xterm/xterm','@xterm/addon-fit','node-pty','@tanstack/react-virtual','react-resizable-panels']) { try { await import(name); throw new Error('Optional peer unexpectedly present: '+name); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; } } console.log('PASS: rich/terminal peers and native PTY absent from base-only consumer.');",
    ],
    baseStage,
  );
  run(['exec', 'vite', 'build'], baseStage);
  run(
    [
      'exec',
      'node',
      '--input-type=module',
      '-e',
      "const {createElement:h}=await import('react'); const {renderToString}=await import('react-dom/server'); const {Field,Input,Card,Table,TableRow,Progress}=await import('@ai-interaction/react'); if(TableRow!==Table.Row)throw new Error('Root table aliases diverged'); const html=renderToString(h(Card,null,h(Field,{label:'Packed field'},h(Input,{value:'Public value',readOnly:true})),h(Table,{label:'Packed native table'},h(Table.Body,null,h(TableRow,null,h(Table.Cell,null,'Public cell')))),h(Progress,{label:'Pending data',value:null}))); if(!html.includes('Public value')||!html.includes('Public cell')||!html.includes('indeterminate'))throw new Error('Generic public SSR missing'); console.log('PASS: generic root controls and native table SSR without optional peers or browser globals.');",
    ],
    baseStage,
  );
  for (const entry of [
    'math',
    'mermaid',
    'code',
    'highlight',
    'terminal',
    'viewport',
    'sidecar',
    'workspace',
    'layout',
    'upload',
  ]) {
    const isolatedStage = await mkdtemp(join(tmpdir(), `ai-interaction-${entry}-only-`));
    log.push(`Isolated ${entry} consumer: ${isolatedStage}`);
    const peers =
      entry === 'layout'
        ? ['react-resizable-panels']
        : entry === 'viewport'
          ? ['@tanstack/react-virtual']
          : entry === 'terminal'
            ? ['@xterm/xterm', '@xterm/addon-fit']
            : entry === 'math'
              ? ['katex']
              : entry === 'mermaid'
                ? ['mermaid', 'dompurify']
                : entry === 'highlight'
                  ? ['shiki']
                  : [];
    await writeFile(
      join(isolatedStage, 'package.json'),
      JSON.stringify(
        {
          private: true,
          type: 'module',
          dependencies: {
            '@ai-interaction/core': `file:${core}`,
            '@ai-interaction/react': `file:${react}`,
            react: rootPkg.devDependencies.react,
            'react-dom': rootPkg.devDependencies['react-dom'],
            ...Object.fromEntries(peers.map((p) => [p, docsPkg.dependencies[p]])),
          },
          devDependencies: Object.fromEntries(
            [
              'vite',
              '@vitejs/plugin-react',
              'typescript',
              '@types/react',
              '@types/react-dom',
              '@types/node',
            ].map((p) => [p, rootPkg.devDependencies[p]]),
          ),
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(isolatedStage, 'pnpm-workspace.yaml'),
      `packages: []\nallowBuilds:\n  esbuild: true\nstrictPeerDependencies: true\noverrides:\n  '@ai-interaction/core': ${JSON.stringify(`file:${core.replaceAll('\\', '/')}`)}\n`,
    );
    await writeFile(
      join(isolatedStage, 'tsconfig.json'),
      JSON.stringify({ ...tsconfig, include: ['main.tsx'] }, null, 2),
    );
    await writeFile(
      join(isolatedStage, 'index.html'),
      `<html lang="en"><head><title>${entry} entry</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>`,
    );
    const body =
      entry === 'upload'
        ? `import {UploadAttachment} from '@ai-interaction/react/upload';\nimport type {UploadCheckpoint} from '@ai-interaction/core/uploads';\nconst value:UploadCheckpoint={context:{workspaceId:'w',threadId:'t',attachmentId:'a',version:'v',uploadId:'u'},revision:1,state:'uploading',access:'available',name:'Public upload',mediaType:'text/plain',sizeBytes:4,receivedBytes:0,sha256:'a'.repeat(64),capabilities:{resume:'supported',cancel:true,remove:true,maxFileBytes:4,maxChunkBytes:2,source:'packed-host',version:'1'}};\ncreateRoot(document.getElementById('root')!).render(<UploadAttachment value={value} reference={value.context} />);`
        : ['sidecar', 'workspace', 'layout'].includes(entry)
          ? `import {${entry === 'sidecar' ? 'Sidecar' : entry === 'workspace' ? 'WorkspaceShell' : 'SplitPane'} as View} from '@ai-interaction/react/${entry}';\nimport type {${entry === 'sidecar' ? 'SidecarProps' : entry === 'workspace' ? 'WorkspaceShellProps' : 'SplitPaneProps'} as Props} from '@ai-interaction/react/${entry}';\nconst props:Props=${entry === 'sidecar' ? "{open:true,onOpenChange:()=>{},title:'Public inspector',mobileBreakpoint:false,children:'Public detail'}" : entry === 'workspace' ? "{main:'Public workspace',mainAs:'section'}" : "{label:'Public split',primary:{id:'a',label:'First',children:'First'},secondary:{id:'b',label:'Second',children:'Second'},sizes:[70,30]}"};\ncreateRoot(document.getElementById('root')!).render(<View {...props}/>);`
          : entry === 'viewport'
            ? `import {ConversationViewport} from '@ai-interaction/react/viewport';\nimport type {ConversationViewportProps} from '@ai-interaction/react/viewport';\nconst props:ConversationViewportProps={value:{context:{workspaceId:'w',threadId:'t',snapshotId:'s',version:'1'},messages:[{id:'m',role:'assistant',text:'Public history',state:'complete',revision:0}],older:{state:'end'},newer:{state:'end'}},mode:'reading'};\ncreateRoot(document.getElementById('root')!).render(<ConversationViewport {...props}/>);`
            : entry === 'terminal'
              ? `import {TerminalEmulator} from '@ai-interaction/react/terminal';\nimport type {TerminalEmulatorProps} from '@ai-interaction/react/terminal';\nimport '@ai-interaction/react/terminal.css';\nconst props:TerminalEmulatorProps={output:'Public terminal sample',state:'complete',context:{sessionId:'s',streamId:'o',version:'1'},variant:'compact'};\ncreateRoot(document.getElementById('root')!).render(<TerminalEmulator {...props}/>);`
              : entry === 'code' || entry === 'highlight'
                ? `import {${entry === 'code' ? 'MarkdownCodeBlock' : 'HighlightedCodeBlock'} as View} from '@ai-interaction/react/${entry}';\nimport type {${entry === 'code' ? 'MarkdownCodeBlockProps' : 'HighlightedCodeBlockProps'} as Props} from '@ai-interaction/react/${entry}';\nconst props:Props={code:'const value = 1;',language:'ts',variant:'numbered'};\ncreateRoot(document.getElementById('root')!).render(<View {...props}/>);`
                : entry === 'math'
                  ? `import {MathFormula} from '@ai-interaction/react/math';\nimport type {MathFormulaProps} from '@ai-interaction/react/math';\nimport 'katex/dist/katex.min.css';\nconst props:MathFormulaProps={formula:'x^2 + y^2 = z^2',variant:'scroll'};\ncreateRoot(document.getElementById('root')!).render(<MathFormula {...props}/>);`
                  : `import {MermaidDiagram} from '@ai-interaction/react/mermaid';\nimport type {MermaidDiagramProps} from '@ai-interaction/react/mermaid';\nconst props:MermaidDiagramProps={code:'flowchart LR\\n A-->B',variant:'minimal'};\ncreateRoot(document.getElementById('root')!).render(<MermaidDiagram {...props}/>);`;
    const diffBody =
      entry === 'highlight'
        ? `\nimport {HighlightedCodeDiff} from '@ai-interaction/react/highlight';\nimport type {HighlightedCodeDiffProps} from '@ai-interaction/react/highlight';\nconst diffProps:HighlightedCodeDiffProps={path:'a.ts',before:'old',after:'new',baseVersion:'a',nextVersion:'b',language:'ts',variant:'split'};\nvoid <HighlightedCodeDiff {...diffProps}/>;`
        : '';
    await writeFile(
      join(isolatedStage, 'main.tsx'),
      "import {createRoot} from 'react-dom/client';\nimport '@ai-interaction/react/styles.css';\n" +
        body +
        diffBody,
    );
    await writeFile(
      join(isolatedStage, 'vite.config.ts'),
      "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n",
    );
    run(['install'], isolatedStage);
    const absent = ['viewport', 'sidecar', 'workspace', 'layout', 'upload'].includes(entry)
      ? [
          'react-markdown',
          'remark-gfm',
          'remend',
          'mermaid',
          'katex',
          'dompurify',
          'remark-math',
          'shiki',
          '@xterm/xterm',
          '@xterm/addon-fit',
          'node-pty',
        ]
      : entry === 'terminal'
        ? [
            'react-markdown',
            'remark-gfm',
            'remend',
            'mermaid',
            'katex',
            'dompurify',
            'remark-math',
            'shiki',
            'node-pty',
          ]
        : entry === 'code' || entry === 'highlight'
          ? [
              'react-markdown',
              'remark-gfm',
              'remend',
              'mermaid',
              'katex',
              'dompurify',
              'remark-math',
              ...(entry === 'code' ? ['shiki'] : []),
            ]
          : entry === 'math'
            ? [
                'shiki',
                'mermaid',
                'dompurify',
                'remark-math',
                'react-markdown',
                'remark-gfm',
                'remend',
              ]
            : ['remark-math', 'react-markdown', 'remark-gfm', 'remend'];
    run(
      [
        'exec',
        'node',
        '--input-type=module',
        '-e',
        `for(const name of ${JSON.stringify([...absent, ...(entry === 'viewport' ? [] : ['@tanstack/react-virtual']), ...(entry === 'layout' ? [] : ['react-resizable-panels'])])}) { try { await import(name); throw new Error('Unrelated optional peer present: '+name); } catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND') throw error; } } console.log('PASS: unrelated optional peers absent from ${entry} consumer.');`,
      ],
      isolatedStage,
    );
    const ssr =
      entry === 'upload'
        ? `const {UploadAttachment}=await import('@ai-interaction/react/upload'); const value={context:{workspaceId:'w',threadId:'t',attachmentId:'a',version:'v',uploadId:'u'},revision:1,state:'uploading',access:'available',name:'Public upload',mediaType:'text/plain',sizeBytes:4,receivedBytes:0,sha256:'a'.repeat(64),capabilities:{resume:'supported',cancel:true,remove:true,maxFileBytes:4,maxChunkBytes:2,source:'packed-host',version:'1'}}; for(const variant of ['row','tile','compact']) {const html=renderToString(createElement(UploadAttachment,{value,reference:value.context,variant})); if(!html.includes('Host-confirmed received bytes')) throw new Error('Upload SSR missing');}`
        : ['sidecar', 'workspace', 'layout'].includes(entry)
          ? `const {${entry === 'sidecar' ? 'Sidecar' : entry === 'workspace' ? 'WorkspaceShell' : 'SplitPane'}:View}=await import('@ai-interaction/react/${entry}'); const html=renderToString(createElement(View,${entry === 'sidecar' ? "{open:true,onOpenChange:()=>{},title:'Public inspector',mobileBreakpoint:false,children:'Public detail'}" : entry === 'workspace' ? "{main:'Public workspace',mainAs:'section'}" : "{label:'Public split',primary:{id:'a',label:'First',children:'First'},secondary:{id:'b',label:'Second',children:'Second'},sizes:[70,30]}"}));if(!html.includes('${entry === 'sidecar' ? 'Public detail' : entry === 'workspace' ? 'Public workspace' : 'First'}')) throw new Error('Layout SSR missing');`
          : entry === 'viewport'
            ? `const {ConversationViewport}=await import('@ai-interaction/react/viewport'); const value={context:{workspaceId:'w',threadId:'t',snapshotId:'s',version:'1'},messages:[{id:'m',role:'assistant',text:'Public history',state:'complete',revision:0}],older:{state:'end'},newer:{state:'end'}}; for(const variant of ['thread','bubble','compact']) {const html=renderToString(createElement(ConversationViewport,{value,mode:'reading',variant})); if(!html.includes('Public history')) throw new Error('History SSR missing');} const html=renderToString(createElement(ConversationViewport,{value}));if(!html.includes('Windowed message rendering')) throw new Error('Virtual history shell missing');`
            : entry === 'terminal'
              ? `const {TerminalEmulator}=await import('@ai-interaction/react/terminal'); for(const variant of ['console','log','compact']) {const html=renderToString(createElement(TerminalEmulator,{output:'Public terminal sample',state:'complete',context:{sessionId:'s',streamId:'o',version:'1'},variant})); if(!html.includes('Public terminal sample')||!html.includes('Loading optional terminal renderer')) throw new Error('Terminal SSR transcript missing');}`
              : entry === 'code' || entry === 'highlight'
                ? `const {${entry === 'code' ? 'MarkdownCodeBlock' : 'HighlightedCodeBlock'}:View}=await import('@ai-interaction/react/${entry}'); const html=renderToString(createElement(View,{code:'const value = 1;',language:'ts'})); if(!html.includes('const value = 1;')) throw new Error('Code SSR fallback missing'); ${entry === 'highlight' ? "const {HighlightedCodeDiff}=await import('@ai-interaction/react/highlight'); const diff=renderToString(createElement(HighlightedCodeDiff,{path:'a.ts',before:'old',after:'new',baseVersion:'a',nextVersion:'b',language:'ts'})); if(!diff.includes('Copy after version')) throw new Error('Diff server rendering missing');" : ''}`
                : entry === 'math'
                  ? `const {MathFormula}=await import('@ai-interaction/react/math'); const html=renderToString(createElement(MathFormula,{formula:'x^2',variant:'block'})); if(!html.includes('<math')) throw new Error('Math SSR missing MathML');`
                  : `const {MermaidDiagram}=await import('@ai-interaction/react/mermaid'); const html=renderToString(createElement(MermaidDiagram,{code:'flowchart LR\\n A-->B',state:'streaming'})); if(!html.includes('Receiving diagram source')) throw new Error('Diagram SSR fallback missing');`;
    run(
      [
        'exec',
        'node',
        '--input-type=module',
        '-e',
        `import {createElement} from 'react'; import {renderToString} from 'react-dom/server'; ${ssr} console.log('PASS: ${entry} entry imports/renders on a server without browser globals.');`,
      ],
      isolatedStage,
    );
    run(['exec', 'tsc', '--noEmit'], isolatedStage);
    run(['exec', 'vite', 'build'], isolatedStage);
  }
  for (const entry of [
    'index',
    'status',
    'markdown',
    'rich-markdown',
    'math',
    'mermaid',
    'code',
    'highlight',
    'terminal',
    'viewport',
    'sidecar',
    'workspace',
    'layout',
    'upload',
  ]) {
    const source = await readFile(`packages/react/dist/${entry}.js`, 'utf8');
    if (!source.startsWith('"use client";')) throw new Error(`Missing client boundary: ${entry}`);
  }
  const hashes = await Promise.all(
    [core, react].map(async (path) => ({
      path,
      sha256: createHash('sha256')
        .update(await readFile(path))
        .digest('hex'),
    })),
  );
  log.push(
    `PASS: packed Vite/Next/type consumers; CSS import; Markdown/math/Mermaid server/client entries; base-only and independent math/diagram/plain-code/highlight/terminal install/build/SSR with unrelated optional peers absent.\n${JSON.stringify(hashes, null, 2)}`,
  );
  console.log(log.at(-1));
} finally {
  await writeFile(join(outputDir, 'verification.txt'), log.join('\n'));
}
