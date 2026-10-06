'use client';
import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@stackunseen/ui';
import { MarketingContact } from '@stackunseen/ui/marketing';
import s from './marketing-template.module.css';

export function ContactDemo() {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof draft, string>>>({});
  const [prepared, setPrepared] = useState(false);
  function change(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setPrepared(false);
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: draft.name.trim() ? undefined : 'Enter your name.',
      email: !draft.email.trim()
        ? 'Enter your email.'
        : emailRef.current?.validity.typeMismatch
          ? 'Enter a valid email address.'
          : undefined,
      message: draft.message.trim() ? undefined : 'Add a little about your project.',
    };
    setErrors(nextErrors);
    const invalid = nextErrors.name
      ? nameRef
      : nextErrors.email
        ? emailRef
        : nextErrors.message
          ? messageRef
          : undefined;
    if (invalid) {
      setPrepared(false);
      invalid.current?.focus();
    } else {
      setPrepared(true);
    }
  }
  return (
    <MarketingContact
      id="folio-contact"
      eyebrow="LET'S TALK"
      title="What are you working on?"
      description="A good workspace starts with understanding the work. Tell us a little about yours."
      aside={
        <p className={s.contactNote}>
          This example validates a draft in your browser. It does not send email or store your
          information.
        </p>
      }
      noValidate
      onSubmit={prepare}
      feedback={
        prepared
          ? { tone: 'info', message: 'Draft prepared locally. Nothing was sent.' }
          : Object.values(errors).some(Boolean)
            ? {
                tone: 'error',
                message: 'Check the highlighted fields before preparing your draft.',
              }
            : undefined
      }
      actions={
        <Button type="submit" className={s.actionButton}>
          Prepare a draft <ArrowUpRight size={16} aria-hidden="true" />
        </Button>
      }
    >
      <div className={s.fieldPair}>
        <Field id={`${id}-name`} label="Your name" required error={errors.name}>
          <Input
            ref={nameRef}
            name="name"
            autoComplete="name"
            maxLength={120}
            value={draft.name}
            onChange={(event) => change('name', event.target.value)}
          />
        </Field>
        <Field id={`${id}-email`} label="Email address" required error={errors.email}>
          <Input
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={draft.email}
            onChange={(event) => change('email', event.target.value)}
          />
        </Field>
      </div>
      <Field
        id={`${id}-message`}
        label="About your project"
        required
        error={errors.message}
        description="A few sentences is plenty. Avoid private or sensitive information."
      >
        <Textarea
          ref={messageRef}
          name="message"
          rows={4}
          maxLength={2000}
          value={draft.message}
          onChange={(event) => change('message', event.target.value)}
        />
      </Field>
      {prepared && (
        <div className={s.draftPreview}>
          <h3>Your local draft</h3>
          <p>
            <strong>{draft.name.trim()}</strong> · {draft.email.trim()}
          </p>
          <p>{draft.message.trim()}</p>
        </div>
      )}
    </MarketingContact>
  );
}
