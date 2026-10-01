'use client';
import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import s from './workspace-shell.module.css';

export interface WorkspaceShellProps extends Omit<ComponentProps<'section'>, 'children'> {
  /** Named workspace landmark, independent of the host application's title. */
  label?: string;
  variant?: 'workspace' | 'contained' | 'compact';
  header?: ReactNode;
  navigation?: ReactNode;
  main: ReactNode;
  inspector?: ReactNode;
  footer?: ReactNode;
  headerLabel?: string;
  footerLabel?: string;
  navigationLabel?: string;
  mainLabel?: string;
  inspectorLabel?: string;
  /** Use section when the workspace is embedded inside an existing main landmark. */
  mainAs?: 'main' | 'section';
  /** Use div when the supplied inspector already owns its aside/dialog semantics. */
  inspectorAs?: 'aside' | 'div';
  /** Panes requires a bounded host height. Narrow layouts share one body scroll owner. */
  scrollMode?: 'flow' | 'panes';
}

function hasSlot(value: ReactNode) {
  return value !== null && value !== undefined && value !== false;
}

/** Layout only: routing, visibility, access and state belong to the host. Slots mount once. */
export function WorkspaceShell({
  label = 'Workspace',
  variant = 'workspace',
  header,
  navigation,
  main,
  inspector,
  footer,
  headerLabel = 'Workspace header',
  footerLabel = 'Workspace footer',
  navigationLabel = 'Workspace navigation',
  mainLabel = 'Workspace content',
  inspectorLabel = 'Workspace inspector',
  mainAs: Main = 'main',
  inspectorAs: Inspector = 'aside',
  scrollMode = 'flow',
  className = '',
  ...props
}: WorkspaceShellProps) {
  const hasNavigation = hasSlot(navigation);
  const hasInspector = hasSlot(inspector);
  return (
    <section
      aria-label={label}
      {...props}
      data-part="workspace-shell"
      data-variant={variant}
      data-scroll-mode={scrollMode}
      className={`${s.root} ${className}`}
    >
      {hasSlot(header) && (
        <header
          role="group"
          aria-label={headerLabel}
          data-part="workspace-header"
          className={s.header}
        >
          {header}
        </header>
      )}
      <div
        data-part="workspace-body"
        data-navigation={hasNavigation}
        data-inspector={hasInspector}
        className={s.body}
      >
        {hasNavigation && (
          <nav
            data-part="workspace-navigation"
            aria-label={navigationLabel}
            tabIndex={scrollMode === 'panes' ? 0 : undefined}
            className={`${s.pane} ${s.navigation}`}
          >
            {navigation}
          </nav>
        )}
        <Main
          data-part="workspace-main"
          aria-label={mainLabel}
          tabIndex={scrollMode === 'panes' ? 0 : undefined}
          className={`${s.pane} ${s.main}`}
        >
          {main}
        </Main>
        {hasInspector && (
          <Inspector
            data-part="workspace-inspector"
            aria-label={Inspector === 'aside' ? inspectorLabel : undefined}
            tabIndex={scrollMode === 'panes' && Inspector === 'aside' ? 0 : undefined}
            className={`${s.pane} ${s.inspector}`}
          >
            {inspector}
          </Inspector>
        )}
      </div>
      {hasSlot(footer) && (
        <footer
          role="group"
          aria-label={footerLabel}
          data-part="workspace-footer"
          className={s.footer}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}

export interface PanelHeaderProps extends Omit<ComponentProps<'header'>, 'children' | 'title'> {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  actionsLabel?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** Contextual header with native Tab order; action groups do not claim toolbar arrow behavior. */
export function PanelHeader({
  title,
  description,
  leading,
  status,
  actions,
  actionsLabel = 'Panel actions',
  headingLevel = 2,
  className = '',
  ...props
}: PanelHeaderProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <header
      role="group"
      aria-labelledby={titleId}
      {...props}
      data-part="panel-header"
      className={`${s.panelHeader} ${className}`}
    >
      <div className={s.headerLayout}>
        {hasSlot(leading) && <div className={s.leading}>{leading}</div>}
        <div className={s.heading}>
          <div className={s.titleRow}>
            <Heading id={titleId} className={s.title}>
              {title}
            </Heading>
            {hasSlot(status) && <div className={s.status}>{status}</div>}
          </div>
          {hasSlot(description) && <div className={s.description}>{description}</div>}
        </div>
        {hasSlot(actions) && (
          <div
            role="group"
            aria-label={actionsLabel}
            data-part="panel-actions"
            className={s.actions}
          >
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
