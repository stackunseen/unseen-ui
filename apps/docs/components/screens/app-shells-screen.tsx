'use client';
import { useState } from 'react';
import { AgentSteps, Button, Message, PromptInput, StatusBadge, Stat, ToolCall } from '@stackunseen/ui';
import { WorkspaceShell } from '@stackunseen/ui/layout';
import { steps, tool } from '../../lib/fixtures';
import s from './screens.module.css';

function Nav({ items, current }: { items: string[]; current: string }) {
  return (
    <nav className={s.shellNav} aria-label="Sections">
      {items.map((item) => (
        <a
          key={item}
          href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
          aria-current={item === current ? 'page' : undefined}
          onClick={(event) => event.preventDefault()}
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

/**
 * Three application shells from WorkspaceShell, each in a bounded frame: a dashboard with a
 * sidebar and inspector, a chat app whose navigation collapses, and a contained tool inside a
 * page. The shell owns landmarks and scrolling; the host owns every value inside.
 */
export function AppShellsScreen() {
  const [navOpen, setNavOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  return (
    <div className={s.shells} data-template="app-shells">
      <section className={s.shellFrame} aria-labelledby="shell-dashboard">
        <h2 id="shell-dashboard">Dashboard shell</h2>
        <p>Header, navigation column, scrolling main and an inspector on the right, with pane scrolling inside a bounded height.</p>
        <div className={s.shellBox}>
          <WorkspaceShell
            label="Dashboard"
            scrollMode="panes"
            mainAs="section"
            header={
              <div className={s.shellHeader}>
                <strong>Larkspur Outdoors</strong>
                <StatusBadge state="running" label="3 runs active" />
              </div>
            }
            navigation={<Nav items={['Overview', 'Runs', 'Approvals', 'Evals', 'Settings']} current="Runs" />}
            main={
              <div className={s.shellMain}>
                <div className={s.stats}>
                  <Stat variant="inset" label="Running" value="3" />
                  <Stat variant="inset" label="Waiting on you" value="1" trend="down" delta="1 approval" />
                  <Stat variant="inset" label="Finished today" value="12" />
                  <Stat variant="inset" label="Spend today" value="$4.12" note="Measured" />
                </div>
                <AgentSteps steps={steps} />
                <ToolCall value={tool} />
              </div>
            }
            inspector={
              <div className={s.shellMain}>
                <strong>Run r1</strong>
                <p className={s.note}>Refund the double-charged orders. Waiting for approval since 08:38.</p>
                <Button size="sm">Open approval</Button>
              </div>
            }
          />
        </div>
      </section>
      <section className={s.shellFrame} aria-labelledby="shell-chat">
        <h2 id="shell-chat">Chat shell</h2>
        <p>Responsive navigation that collapses on wide screens and becomes a drawer on narrow ones, with the composer in the footer.</p>
        <div className={s.shellBox}>
          <WorkspaceShell
            label="Assistant"
            scrollMode="panes"
            mainAs="section"
            navigationMode="responsive"
            navigationOpen={navOpen}
            onNavigationOpenChange={setNavOpen}
            header={
              <div className={s.shellHeader}>
                <strong>Assistant</strong>
                <span className={s.note}>Sonnet 5.5</span>
              </div>
            }
            navigation={<Nav items={['Today', 'Refund batch', 'Winter catalogue', 'Help centre']} current="Refund batch" />}
            main={
              <div className={s.shellMain}>
                <Message
                  variant="bubble"
                  value={{ id: 'q', role: 'user', revision: 1, text: 'Which orders were charged twice on Saturday?', state: 'complete' }}
                />
                <Message
                  value={{
                    id: 'a',
                    role: 'assistant',
                    revision: 1,
                    text: '38 orders were charged twice between 02:10 and 03:40. I have drafted a refund batch of €1,214.60 and will not send it without your approval.',
                    state: 'complete',
                  }}
                />
              </div>
            }
            footer={
              <PromptInput
                value={prompt}
                onValueChange={setPrompt}
                onSubmit={() => setPrompt('')}
                placeholder="Ask about the refund batch…"
              />
            }
          />
        </div>
      </section>
      <section className={s.shellFrame} aria-labelledby="shell-contained">
        <h2 id="shell-contained">Contained tool shell</h2>
        <p>The compact variant for a tool embedded in a page: navigation and main only, no header, the page keeps the scroll.</p>
        <div className={`${s.shellBox} ${s.shellBoxAuto}`}>
          <WorkspaceShell
              label="Glossary"
              variant="contained"
              mainAs="section"
              navigation={<Nav items={['Terms', 'Pending review', 'History']} current="Terms" />}
              main={
                <div className={s.shellMain}>
                  <strong>212 terms</strong>
                  <p className={s.note}>Product names and their approved German translations. The translator checks each draft against this list.</p>
                  <StatusBadge state="succeeded" label="Checked 08:39" />
                </div>
              }
            />
        </div>
      </section>
    </div>
  );
}
