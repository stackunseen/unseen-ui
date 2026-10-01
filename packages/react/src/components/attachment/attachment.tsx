'use client';
import { Children, createContext, useContext, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { safeUrl } from '@ai-interaction/core';
import type { MessagePart } from '@ai-interaction/core';
import type { AttachmentState, AttachmentAccess } from '@ai-interaction/core/uploads';
export type { AttachmentState, AttachmentAccess } from '@ai-interaction/core/uploads';
import { Button } from '../button/button.js';
import { Modal } from '../modal/modal.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from './attachment.module.css';

export type AttachmentReference = Pick<
  Extract<MessagePart, { type: 'attachment' }>,
  'attachmentId' | 'version'
>;
export type AttachmentPreviewSource =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'text'; text: string }
  | { kind: 'audio'; src: string; transcript?: string }
  | { kind: 'video'; src: string; captions?: { src: string; language: string; label: string } };
export interface AttachmentProps
  extends Omit<ComponentProps<'div'>, 'onProgress' | 'resource'>, VariantProps<'Attachment'> {
  name: string;
  state: AttachmentState;
  detail?: string;
  mediaType?: string;
  sizeBytes?: number;
  /** Measured byte counts from the upload delegate; never a simulated percentage. */
  progress?: { loaded: number; total: number };
  access?: AttachmentAccess;
  /** Requested immutable file version. Missing/mismatched resources remain inspectable. */
  reference?: AttachmentReference;
  /** Identity of the supplied metadata/preview. Versions must describe immutable content. */
  resource?: AttachmentReference;
  preview?: AttachmentPreviewSource;
  onRemove?: () => void;
  onRetry?: () => void;
  /** Host opens an authorized original; the component never downloads automatically. */
  onOpen?: () => void;
}
const AttachmentContext = createContext<AttachmentProps | null>(null);
function useAttachment() {
  const value = useContext(AttachmentContext);
  if (!value) throw new Error('Attachment parts must be inside Attachment.Root.');
  return value;
}
function matchesReference(reference?: AttachmentReference | null, resource?: AttachmentReference) {
  return (
    !reference ||
    (resource?.attachmentId === reference.attachmentId && resource.version === reference.version)
  );
}
function allowedSource(value: string): string | undefined {
  if (!value || value.length > 4096 || /[\s\\]/u.test(value)) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('blob:')) return safeUrl(value.slice(5)) ? value : undefined;
  return safeUrl(value);
}
function byteCount(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0;
}
function formatSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 ** 2).toFixed(1)} MiB`;
}
function AttachmentRoot({
  variant = 'row',
  access = 'available',
  name,
  state,
  detail,
  mediaType,
  sizeBytes,
  progress,
  reference,
  resource,
  preview,
  onRemove,
  onRetry,
  onOpen,
  children,
  className = '',
  ...props
}: AttachmentProps) {
  const resolved = matchesReference(reference, resource);
  const value = {
    variant,
    access,
    name: !resolved ? 'Attachment unavailable' : name.trim() ? name : 'Unnamed file',
    state,
    detail: resolved ? detail : undefined,
    mediaType: resolved ? mediaType : undefined,
    sizeBytes: resolved ? sizeBytes : undefined,
    progress,
    reference,
    resource,
    preview: resolved ? preview : undefined,
    onRemove,
    onRetry,
    onOpen,
  };
  return (
    <AttachmentContext.Provider value={value}>
      <div
        {...props}
        className={`${s.item} ${s.attachment} ${a.root} ${className}`}
        data-variant={variant}
        data-state={state}
        data-access={access}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
}
function AttachmentInfo() {
  const { name, state, detail, mediaType, sizeBytes, access, reference, resource } =
    useAttachment();
  const matched = matchesReference(reference, resource);
  const metadata = [mediaType, byteCount(sizeBytes) ? formatSize(sizeBytes) : undefined]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={`${s.grow} ${a.info}`} data-part="attachment-info">
      <strong>{name}</strong>
      {metadata && <div className={s.muted}>{metadata}</div>}
      <div className={access === 'available' && matched ? s.muted : s.warning} role="status">
        {!matched
          ? 'Attachment version unavailable. The host must resolve this file.'
          : state === 'removed'
            ? 'Removed'
            : access === 'available'
              ? {
                  selected: 'Selected',
                  uploading: 'Uploading',
                  ready: 'Ready',
                  failed: 'Upload failed',
                  removing: 'Removing',
                  cancelled: 'Upload cancelled',
                  removed: 'Removed',
                  'outcome-unknown': 'Upload outcome unknown. Check status before retrying.',
                }[state]
              : `Access ${access}. Preview unavailable.`}
      </div>
      {detail && <div className={state === 'failed' ? s.error : s.muted}>{detail}</div>}
    </div>
  );
}
function AttachmentProgress() {
  const { name, state, progress, access, variant, reference, resource } = useAttachment();
  if (state !== 'uploading' || access !== 'available' || !matchesReference(reference, resource))
    return null;
  const known =
    progress &&
    byteCount(progress.loaded) &&
    byteCount(progress.total) &&
    progress.total > 0 &&
    progress.loaded <= progress.total;
  const progressText = known
    ? `${formatSize(progress.loaded)} of ${formatSize(progress.total)}${progress.loaded === progress.total ? ' · Waiting for confirmation' : ''}`
    : undefined;
  return (
    <div className={a.progress}>
      {known ? (
        <>
          <progress
            className={s.progress}
            aria-label={`Upload ${name}`}
            aria-valuetext={progressText}
            max={progress.total}
            value={progress.loaded}
          />
          <span className={s.muted}>{progressText}</span>
        </>
      ) : (
        <LoadingIndicator
          size="small"
          variant={variant === 'compact' ? 'dots' : variant === 'tile' ? 'bars' : 'spinner'}
          label="Upload progress unavailable"
          aria-label={`Uploading ${name}. Progress unavailable.`}
        />
      )}
    </div>
  );
}
function PreviewContent({ source, name }: { source: AttachmentPreviewSource; name: string }) {
  const [failed, setFailed] = useState(false);
  const [failedCaption, setFailedCaption] = useState<string>();
  if (source.kind === 'text')
    return (
      <>
        <pre className={a.text} tabIndex={0} role="region" aria-label={`${name} text preview`}>
          {source.text.slice(0, 20_000)}
        </pre>
        {source.text.length > 20_000 && (
          <p className={s.muted}>
            Preview limited to 20,000 characters. Open the original for the full file.
          </p>
        )}
      </>
    );
  const src = allowedSource(source.src);
  if (!src || failed)
    return <p role="status">Preview unavailable. Check access or open the original.</p>;
  if (source.kind === 'image')
    return (
      <img
        className={a.media}
        src={src}
        alt={source.alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  if (source.kind === 'audio')
    return (
      <div className={a.mediaContent}>
        <audio
          className={a.media}
          controls
          preload="none"
          src={src}
          aria-label={name}
          onError={() => setFailed(true)}
        />
        {source.transcript && (
          <pre className={a.text} tabIndex={0} role="region" aria-label={`${name} transcript`}>
            {source.transcript.slice(0, 20_000)}
          </pre>
        )}
        {source.transcript && source.transcript.length > 20_000 && (
          <p className={s.muted}>Transcript preview limited to 20,000 characters.</p>
        )}
        {!source.transcript && <p className={s.muted}>No transcript was supplied.</p>}
      </div>
    );
  const captions = source.captions && allowedSource(source.captions.src);
  return (
    <div className={a.mediaContent}>
      <video
        className={a.media}
        controls
        preload="none"
        playsInline
        src={src}
        aria-label={name}
        onError={(event) => {
          if (event.target === event.currentTarget) setFailed(true);
        }}
      >
        {captions && source.captions && (
          <track
            kind="captions"
            src={captions}
            srcLang={source.captions.language}
            label={source.captions.label}
            default
            ref={(node) => {
              if (!node) return;
              // Track load errors are non-bubbling; own the listener for this element.
              const onError = () => setFailedCaption(captions);
              node.addEventListener('error', onError);
              return () => node.removeEventListener('error', onError);
            }}
          />
        )}
      </video>
      {!captions && <p className={s.muted}>No captions were supplied.</p>}
      {captions && failedCaption === captions && (
        <p className={s.warning} role="status">
          Captions unavailable. Video playback is still available.
        </p>
      )}
    </div>
  );
}
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const url = allowedSource(src);
  return url && !failed ? (
    <img
      className={a.thumbnail}
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <AIIcon name="document" />
  );
}
function AttachmentPreview() {
  const { preview, access, state, name, onOpen, reference, resource } = useAttachment();
  const [open, setOpen] = useState(false);
  const [inspected, setInspected] = useState(false);
  const [openedReference, setOpenedReference] = useState<AttachmentReference | null>(null);
  const currentReference = reference ?? resource;
  const expected = open ? openedReference : currentReference;
  const matched = matchesReference(expected, resource);
  if (!preview && !currentReference && !inspected) return <AIIcon name="document" />;
  const available =
    !!preview && matched && access === 'available' && state !== 'removing' && state !== 'removed';
  const title = matched ? name : 'Attachment unavailable';
  // Retain only the opened identity, never a revoked preview or URL.
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setInspected(true);
          setOpenedReference(currentReference ? { ...currentReference } : null);
        }
        setOpen(next);
      }}
      title={title}
      description={
        expected ? `Attached file · version ${expected.version}` : 'Preview of the attached file.'
      }
      trigger={
        <Button
          variant="outline"
          className={a.previewTrigger}
          aria-label={`${available ? 'Preview' : 'Inspect'} ${title}`}
        >
          {available && preview?.kind === 'image' ? (
            <Thumbnail key={preview.src} src={preview.src} />
          ) : (
            <AIIcon
              name={
                available || (matched && access === 'available' && state !== 'failed')
                  ? 'document'
                  : 'warning'
              }
            />
          )}
          <span>{available ? 'Preview' : 'Details'}</span>
        </Button>
      }
    >
      {available && preview ? (
        <PreviewContent
          key={`${resource?.attachmentId ?? ''}:${resource?.version ?? ''}:${preview.kind === 'text' ? 'text' : `${preview.kind}:${preview.src}`}`}
          source={preview}
          name={name}
        />
      ) : (
        <p role="status">
          {!matched
            ? 'Attachment version unavailable. The host must resolve this file.'
            : state === 'removing'
              ? 'Attachment is being removed.'
              : state === 'removed'
                ? 'Attachment has been removed. Content is unavailable.'
                : access !== 'available'
                  ? `Access ${access}. Content is unavailable.`
                  : 'Preview unavailable. The host did not supply content.'}
        </p>
      )}
      {available && state === 'ready' && onOpen && (
        <div className={s.actions}>
          <Button variant="outline" onClick={onOpen}>
            Open original
          </Button>
        </div>
      )}
    </Modal>
  );
}
function AttachmentActions() {
  const { name, state, access, onOpen, onRemove, onRetry, reference, resource } = useAttachment();
  const available =
    access === 'available' &&
    state !== 'removing' &&
    state !== 'removed' &&
    matchesReference(reference, resource);
  if (!onRemove && !(state === 'failed' && onRetry) && !onOpen) return null;
  return (
    <div className={s.actions}>
      {onOpen && (
        <Button
          size="sm"
          variant="ghost"
          disabled={!available || state !== 'ready'}
          onClick={onOpen}
        >
          Open original
        </Button>
      )}
      {state === 'failed' && onRetry && (
        <IconButton icon="retry" label="Retry upload" disabled={!available} onClick={onRetry} />
      )}
      {onRemove && (
        <IconButton
          icon="close"
          label={`Remove ${name}`}
          disabled={state === 'removing' || state === 'removed'}
          onClick={onRemove}
        />
      )}
    </div>
  );
}
function AttachmentComponent({ children, ...props }: AttachmentProps) {
  return (
    <AttachmentRoot {...props}>
      {children ?? (
        <>
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentActions />
          <AttachmentProgress />
        </>
      )}
    </AttachmentRoot>
  );
}
export const Attachment = Object.assign(AttachmentComponent, {
  Root: AttachmentRoot,
  Info: AttachmentInfo,
  Preview: AttachmentPreview,
  Actions: AttachmentActions,
  Progress: AttachmentProgress,
});

export function AttachmentGroup({
  children,
  variant = 'list',
  label = 'Attachments',
  empty = 'No attachments.',
  className = '',
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
  variant?: 'list' | 'grid' | 'inline';
  label?: string;
  empty?: ReactNode;
}) {
  const content = Children.toArray(children);
  return (
    <div
      {...props}
      role="group"
      aria-label={label}
      className={`${a.group} ${className}`}
      data-variant={variant}
    >
      {content.length ? content : <p className={s.muted}>{empty}</p>}
    </div>
  );
}

export interface AttachmentRejection {
  file: File;
  reason: 'type' | 'size' | 'count';
}
export interface AttachmentPickerProps {
  onFilesSelected: (files: File[]) => void;
  onReject?: (rejections: AttachmentRejection[]) => void;
  /** Comma-separated MIME types, MIME wildcards, or file extensions. Still validate on the host. */
  accept?: string;
  maxFileBytes?: number;
  /** Available slots, including existing attachments; host updates this value. */
  remainingSlots?: number;
  disabled?: boolean;
  label?: string;
}
export function AttachmentPicker({
  onFilesSelected,
  onReject,
  accept,
  maxFileBytes,
  remainingSlots = 10,
  disabled = false,
  label = 'Add files',
}: AttachmentPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const [rejectedNames, setRejectedNames] = useState<
    { name: string; reason: AttachmentRejection['reason'] }[]
  >([]);
  const slots =
    Number.isSafeInteger(remainingSlots) && remainingSlots >= 0 ? Math.min(remainingSlots, 100) : 0;
  const validSize = maxFileBytes === undefined || (byteCount(maxFileBytes) && maxFileBytes > 0);
  const locked = disabled || slots === 0 || !validSize;
  const accepts = (file: File) =>
    !accept ||
    accept.split(',').some((part) => {
      const rule = part.trim().toLowerCase();
      return rule.startsWith('.')
        ? file.name.toLowerCase().endsWith(rule)
        : rule.endsWith('/*')
          ? file.type.toLowerCase().startsWith(rule.slice(0, -1))
          : file.type.toLowerCase() === rule;
    });
  return (
    <div className={a.picker}>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={accept}
        disabled={locked}
        onChange={(event) => {
          const incoming = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (locked) return;
          const accepted: File[] = [],
            rejected: AttachmentRejection[] = [];
          for (const file of incoming) {
            const reason = !accepts(file)
              ? 'type'
              : maxFileBytes !== undefined && file.size > maxFileBytes
                ? 'size'
                : accepted.length >= slots
                  ? 'count'
                  : undefined;
            if (reason) rejected.push({ file, reason });
            else accepted.push(file);
          }
          setRejectedNames(
            rejected.slice(0, 10).map(({ file, reason }) => ({ name: file.name, reason })),
          );
          setNotice(
            rejected.length
              ? `${rejected.length} file${rejected.length === 1 ? '' : 's'} not added. Check file type, size and available slots.`
              : accepted.length
                ? `${accepted.length} file${accepted.length === 1 ? '' : 's'} selected.`
                : '',
          );
          if (rejected.length) onReject?.(rejected);
          if (accepted.length) onFilesSelected(accepted);
        }}
      />
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => input.current?.click()}>
        <AIIcon name="document" />
        {label}
      </Button>
      <span role="status" className={s.muted}>
        {notice}
      </span>
      {rejectedNames.length > 0 && (
        <ul className={a.rejections} aria-label="Files not added">
          {rejectedNames.map((file, index) => (
            <li key={`${index}:${file.name}`}>
              {file.name}:{' '}
              {file.reason === 'type'
                ? 'File type not accepted'
                : file.reason === 'size'
                  ? 'File exceeds the size limit'
                  : 'No attachment slots available'}
              .
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
