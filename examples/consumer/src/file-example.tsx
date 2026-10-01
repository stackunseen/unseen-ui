'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, FileExplorer } from '@ai-interaction/react';
import type {
  FileOpenRequest,
  FilePage,
  WorkspaceFile,
  WorkspaceFileSnapshot,
} from '@ai-interaction/react';
type Window = { files: WorkspaceFile[]; context: WorkspaceFileSnapshot; pagination: FilePage };
export function FileExample() {
  const [window, setWindow] = useState<Window>(),
    [selection, setSelection] = useState<FileOpenRequest>(),
    [preview, setPreview] = useState<string>(),
    [status, setStatus] = useState<'unknown' | 'loading' | 'ready' | 'denied' | 'error' | 'stale'>(
      'unknown',
    ),
    [message, setMessage] = useState(''),
    [expanded, setExpanded] = useState(['/src', '/tests']);
  const generation = useRef(0),
    request = useRef<AbortController | undefined>(undefined);
  useEffect(
    () => () => {
      ++generation.current;
      request.current?.abort();
    },
    [],
  );
  async function load(pageIndex = 0) {
    const revision = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus('loading');
    setSelection(undefined);
    setPreview(undefined);
    setMessage('');
    try {
      const response = await fetch(`/api/files?pageIndex=${pageIndex}&pageSize=3`, {
        signal: controller.signal,
      });
      if (revision !== generation.current) return;
      if (!response.ok) {
        setStatus(response.status === 403 ? 'denied' : 'error');
        setWindow(undefined);
        return;
      }
      const next = (await response.json()) as Window;
      if (revision !== generation.current) return;
      setWindow(next);
      setStatus('ready');
    } catch {
      if (revision === generation.current) {
        setWindow(undefined);
        setStatus('error');
      }
    }
  }
  async function open(next: FileOpenRequest) {
    const revision = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setMessage('Host file read pending. Selection waits for its receipt.');
    try {
      const response = await fetch('/api/files/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
        signal: controller.signal,
      });
      const receipt = (await response.json()) as {
        request?: FileOpenRequest;
        outcome?: string;
        text?: string;
        message?: string;
      };
      if (revision !== generation.current) return;
      if (!response.ok) {
        setSelection(undefined);
        setPreview(undefined);
        setMessage(receipt.message ?? 'Read failed. Refresh the file window.');
        if (response.status === 403) {
          setStatus('denied');
          setWindow(undefined);
        }
        if (response.status === 409) setStatus('stale');
        return;
      }
      if (
        receipt.outcome !== 'read' ||
        typeof receipt.text !== 'string' ||
        receipt.text.length > 65536 ||
        !(['workspaceId', 'snapshotVersion', 'fileId', 'path', 'fileVersion'] as const).every(
          (key) => receipt.request?.[key] === next[key],
        )
      ) {
        setMessage('Invalid file read receipt.');
        setSelection(undefined);
        setPreview(undefined);
        return;
      }
      setSelection(next);
      setPreview(receipt.text);
      setMessage('Host acknowledged the current file read.');
    } catch {
      if (revision === generation.current) {
        setSelection(undefined);
        setPreview(undefined);
        setMessage('Read receipt unavailable. Refresh before reading again.');
      }
    }
  }
  async function access(authorized: boolean) {
    ++generation.current;
    request.current?.abort();
    setSelection(undefined);
    setPreview(undefined);
    const revision = generation.current;
    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorized }),
      });
      if (revision !== generation.current) return;
      if (!response.ok) {
        setStatus('error');
        setWindow(undefined);
        return;
      }
      await load();
    } catch {
      if (revision === generation.current) {
        setStatus('error');
        setWindow(undefined);
      }
    }
  }
  return (
    <section
      aria-label="Local file host example"
      style={{
        display: 'grid',
        gap: 'var(--ai-gap, 12px)',
        marginBlock: 24,
        minWidth: 0,
        color: 'var(--ai-text)',
        background: 'var(--ai-surface)',
      }}
    >
      <h2 style={{ margin: 0 }}>Read-only file host</h2>
      <p>
        Connect to the dedicated sample workspace served by pnpm files:demo. This host reads actual
        sample files; it does not edit or execute them.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button
          onClick={() => {
            void load();
          }}
        >
          Connect sample file host
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void access(status === 'denied');
          }}
        >
          {status === 'denied' ? 'Restore sample host access' : 'Revoke sample host access'}
        </Button>
      </div>
      <FileExplorer
        title="Host workspace files"
        files={window?.files ?? []}
        context={window?.context}
        pagination={window?.pagination}
        status={status}
        expandedPaths={expanded}
        onExpandedPathsChange={setExpanded}
        selection={selection}
        onRequestOpen={(next) => {
          void open(next);
        }}
        onPageChange={(index) => {
          void load(index);
        }}
        onRefresh={() => {
          void load(window?.pagination.pageIndex ?? 0);
        }}
      />
      {message && <p role="status">{message}</p>}
      {status === 'ready' && preview !== undefined && (
        <pre
          role="group"
          aria-label="Acknowledged file source"
          tabIndex={0}
          style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            maxHeight: 300,
            overflow: 'auto',
            margin: 0,
          }}
        >
          {preview}
        </pre>
      )}
    </section>
  );
}
