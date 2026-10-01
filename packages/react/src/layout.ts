/** Application foundations. SplitPane requires the optional resizing peer. */
export { Sidecar } from './components/sidecar/sidecar.js';
export type { SidecarProps, SidecarPresentation } from './components/sidecar/sidecar.js';
export { WorkspaceShell, PanelHeader } from './components/workspace-shell/workspace-shell.js';
export type {
  WorkspaceShellProps,
  PanelHeaderProps,
} from './components/workspace-shell/workspace-shell.js';
export { SplitPane } from './components/split-pane/split-pane.js';
export type {
  SplitPaneProps,
  SplitPanePanel,
  SplitPaneSizes,
  SplitPaneResizeRequest,
} from './components/split-pane/split-pane.js';
