'use client';
import { useId, useRef, useState } from 'react';
import type { ComponentProps, DragEvent, ReactNode } from 'react';
import { UploadIcon } from '@radix-ui/react-icons';
import { Button } from '../button/button.js';
import {
  partitionFiles,
  rejectionReasonText,
  selectionLocked,
  selectionNotice,
  selectionSlots,
} from '../attachment/file-selection.js';
import type { AttachmentRejection, FileSelectionLimits } from '../attachment/file-selection.js';
import s from '../../shared/styles/styles.module.css';
import d from './file-dropzone.module.css';

export interface FileDropzoneProps
  extends FileSelectionLimits, Omit<ComponentProps<'div'>, 'onDrop' | 'children' | 'title'> {
  /** Receives accepted browser File objects. The host validates, uploads and stores them. */
  onFilesSelected: (files: File[]) => void;
  onReject?: (rejections: AttachmentRejection[]) => void;
  /** Allow more than one file per drop or browse. Defaults to true. */
  multiple?: boolean;
  disabled?: boolean;
  /** Heading inside the zone. */
  label?: string;
  /** Text of the keyboard-reachable button that opens the file chooser. */
  browseLabel?: string;
  /** Accepted types, limits or anything else the person should know before choosing. */
  hint?: ReactNode;
  /** Extra content under the hint, such as a list of files already chosen. */
  children?: ReactNode;
}

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * A drop target for local files with a keyboard path through its browse button.
 * It never uploads: accepted File objects go to the host through `onFilesSelected`.
 */
export function FileDropzone({
  onFilesSelected,
  onReject,
  accept,
  maxFileBytes,
  remainingSlots = 10,
  multiple = true,
  disabled = false,
  label = 'Drop files here',
  browseLabel = 'Browse files',
  hint,
  children,
  className = '',
  ...props
}: FileDropzoneProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [rejectedNames, setRejectedNames] = useState<
    { name: string; reason: AttachmentRejection['reason'] }[]
  >([]);
  const slots = Math.min(selectionSlots(remainingSlots), multiple ? 100 : 1);
  const locked = selectionLocked({ disabled, maxFileBytes, remainingSlots: slots });

  function receive(incoming: readonly File[]) {
    if (locked) return;
    const { accepted, rejected } = partitionFiles(incoming, {
      accept,
      maxFileBytes,
      remainingSlots: slots,
    });
    setRejectedNames(
      rejected.slice(0, 10).map(({ file, reason }) => ({ name: file.name, reason })),
    );
    setNotice(selectionNotice(accepted.length, rejected.length));
    if (rejected.length) onReject?.(rejected);
    if (accepted.length) onFilesSelected(accepted);
  }

  return (
    <div
      {...props}
      className={`${d.zone} ${className}`}
      data-part="file-dropzone"
      data-dragging={dragging || undefined}
      data-disabled={locked || undefined}
      onDragEnter={(event) => {
        props.onDragEnter?.(event);
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        if (!locked) setDragging(true);
      }}
      onDragOver={(event) => {
        props.onDragOver?.(event);
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = locked ? 'none' : 'copy';
      }}
      onDragLeave={(event) => {
        props.onDragLeave?.(event);
        if (!hasFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        receive(Array.from(event.dataTransfer.files));
      }}
      onClick={(event) => {
        props.onClick?.(event);
        if (locked || event.defaultPrevented) return;
        const target = event.target as HTMLElement;
        // The button already opens the chooser; a plain click elsewhere in the zone does too.
        if (target.closest('button, a, input, [role="button"]')) return;
        input.current?.click();
      }}
    >
      <input
        ref={input}
        id={`${id}-input`}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        disabled={locked}
        onChange={(event) => {
          const incoming = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          receive(incoming);
        }}
      />
      <UploadIcon aria-hidden="true" className={d.icon} />
      <div className={d.body}>
        <p className={d.label} id={`${id}-label`}>
          {label}
        </p>
        {hint && (
          <p className={`${s.muted} ${d.hint}`} id={`${id}-hint`}>
            {hint}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={locked}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onClick={() => input.current?.click()}
        >
          {browseLabel}
        </Button>
        <span role="status" className={s.muted}>
          {notice}
        </span>
        {rejectedNames.length > 0 && (
          <ul className={d.rejections} aria-label="Files not added">
            {rejectedNames.map((file, index) => (
              <li key={`${index}:${file.name}`}>
                {file.name}: {rejectionReasonText(file.reason)}.
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  );
}
