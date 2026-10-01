import { useEffect, useRef, useState } from 'react';
import {
  AITheme,
  AIIcon,
  AlertDialog,
  Button,
  DropdownMenu,
  IconsProvider,
  Sidebar,
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@ai-interaction/react';
import { DemoLogin } from './login';
import { AccountTable } from './account-table';
import { Overview } from './overview';
import { RelayAssistant } from './assistant';
import { AccountsIcon, OverviewIcon, RelayMark } from './icons';
import type { Account } from './data';
import { sampleAccounts } from './data';
import { relayTheme } from './theme';
import s from './relay.module.css';

function Workspace({
  name,
  onLeave,
  dark,
  onAppearance,
}: {
  name: string;
  onLeave: () => void;
  dark: boolean;
  onAppearance: () => void;
}) {
  const [accounts, setAccounts] = useState<readonly Account[]>(sampleAccounts);
  const [selectedId, setSelectedId] = useState<string>();
  const [view, setView] = useState('overview');
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState<{ id: number; text: string; open: boolean }>({
    id: 0,
    text: '',
    open: false,
  });
  const [assistantVersion, setAssistantVersion] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  const assistant = useRef<HTMLDivElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  function save(account: Account) {
    setAccounts((current) => current.map((item) => (item.id === account.id ? account : item)));
    setNotice((current) => ({ id: current.id + 1, text: `${account.name} updated`, open: true }));
  }
  function select(id: string) {
    setSelectedId(id);
  }
  function openAssistant(id?: string) {
    if (id) select(id);
    assistant.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    assistant.current?.focus({ preventScroll: true });
  }
  return (
    <ToastProvider>
      <div className={s.workspace}>
        <a className={s.skip} href="#workspace-content">
          Skip to workspace
        </a>
        <aside className={s.sidebar}>
          <div className={s.brand}>
            <span className={s.brandMark}>
              <RelayMark />
            </span>
            relay
          </div>
          <div className={s.workspaceName}>
            <span className={s.workspaceAvatar} aria-hidden="true">
              N
            </span>
            <div>
              Northstar Studio<small>Customer operations</small>
            </div>
          </div>
          <Sidebar label="Workspace navigation">
            <Sidebar.Group label="Workspace">
              {[
                { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
                { id: 'accounts', label: 'Accounts', icon: <AccountsIcon /> },
              ].map((item) => (
                <Sidebar.Link
                  key={item.id}
                  href={`#${item.id}`}
                  current={view === item.id}
                  icon={item.icon}
                  onClick={(event) => {
                    event.preventDefault();
                    setView(item.id);
                    requestAnimationFrame(() => title.current?.focus());
                  }}
                >
                  {item.label}
                </Sidebar.Link>
              ))}
            </Sidebar.Group>
          </Sidebar>
          <div className={s.sidebarNote}>
            <span className={s.demoPill}>Demo workspace</span>
            <p>
              Fictional accounts.
              <br />
              Changes stay in this session.
            </p>
            <a href="http://127.0.0.1:4173/?view=templates">
              Explore the template <AIIcon name="external" size={12} />
            </a>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" className={s.profile} aria-label="Open profile menu">
                <span className={s.avatar} aria-hidden="true">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  {name}
                  <small>Demo member</small>
                </span>
                <AIIcon name="expand" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Demo session</DropdownMenu.Label>
              <DropdownMenu.Item onSelect={onAppearance}>
                {dark ? 'Use light appearance' : 'Use dark appearance'}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={onLeave}>Leave demo</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </aside>
        <div className={s.body}>
          <header className={s.topbar}>
            <p>
              Workspace <span aria-hidden="true">/</span>{' '}
              <strong>{view === 'overview' ? 'Overview' : 'Accounts'}</strong>
            </p>
            <div className={s.topbarActions}>
              <span className={s.snapshot}>Sample snapshot · Oct 1, 2026</span>
              <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialog.Trigger asChild>
                  <Button variant="ghost" size="sm">
                    Reset demo
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>Reset this workspace?</AlertDialog.Title>
                  <AlertDialog.Description>
                    Your edits and assistant conversation will be cleared. The original sample
                    accounts will return.
                  </AlertDialog.Description>
                  <AlertDialog.Actions>
                    <AlertDialog.Cancel>Keep working</AlertDialog.Cancel>
                    <AlertDialog.Action
                      onAction={() => {
                        setAccounts(sampleAccounts);
                        setSelectedId(undefined);
                        setAssistantVersion((current) => current + 1);
                        setResetOpen(false);
                        setNotice((current) => ({
                          id: current.id + 1,
                          text: 'Sample workspace restored',
                          open: true,
                        }));
                      }}
                    >
                      Reset demo
                    </AlertDialog.Action>
                  </AlertDialog.Actions>
                </AlertDialog.Content>
              </AlertDialog>
            </div>
          </header>
          <div className={s.contentGrid}>
            <main id="workspace-content" className={s.main} tabIndex={-1}>
              <div className={s.pageHeading}>
                <div>
                  <p className={s.eyebrow}>Customer operations</p>
                  <h1 ref={title} tabIndex={-1}>
                    {view === 'overview'
                      ? 'A clear view of your accounts.'
                      : 'Every relationship, in view.'}
                  </h1>
                  <p>
                    {view === 'overview'
                      ? 'A few thoughtful follow-ups can move the week forward.'
                      : 'Find an account and keep its next step up to date.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openAssistant()}>
                  Open assistant <AIIcon name="external" size={12} />
                </Button>
              </div>
              {view === 'overview' && <Overview accounts={accounts} onSelect={openAssistant} />}
              <AccountTable
                key={assistantVersion}
                accounts={accounts}
                onSave={save}
                onSelect={select}
              />
              <footer className={s.pageFooter}>
                <span>All figures come from the editable sample records.</span>
                <span>Built with Unseen UI</span>
              </footer>
            </main>
            <div
              ref={assistant}
              className={s.assistant}
              role="complementary"
              tabIndex={-1}
              aria-label="Assistant panel"
            >
              <RelayAssistant
                key={assistantVersion}
                accounts={accounts}
                selectedAccount={accounts.find((account) => account.id === selectedId)}
                onClearContext={() => {
                  setSelectedId(undefined);
                  assistant.current?.focus();
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <Toast
        key={notice.id}
        open={notice.open}
        onOpenChange={(open) => setNotice((current) => ({ ...current, open }))}
        tone="success"
      >
        <ToastTitle>{notice.text}</ToastTitle>
        <ToastDescription>Saved in this demo session only.</ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

export function RelayApp() {
  const [name, setName] = useState<string>();
  const [dark, setDark] = useState(false);
  return (
    <IconsProvider>
      <AITheme theme={relayTheme} appearance={dark ? 'dark' : 'light'} className={s.root}>
        {name ? (
          <Workspace
            name={name}
            dark={dark}
            onAppearance={() => setDark(!dark)}
            onLeave={() => setName(undefined)}
          />
        ) : (
          <DemoLogin onEnter={setName} />
        )}
      </AITheme>
    </IconsProvider>
  );
}
