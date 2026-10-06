import { useState } from 'react';
import { AIIcon, Button, Card, Field, Input } from '@stackunseen/ui';
import { RelayMark } from './icons';
import s from './relay.module.css';

export function DemoLogin({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState('Alex Morgan');
  const [error, setError] = useState('');
  return (
    <main className={s.login}>
      <section className={s.loginStory} aria-labelledby="welcome-title">
        <div className={s.brand}>
          <span className={s.brandMark}>
            <RelayMark />
          </span>
          relay<span className={s.brandCaption}>Customer workspace</span>
        </div>
        <div className={s.loginMessage}>
          <p className={s.eyebrow}>A little clarity for your day</p>
          <h1 id="welcome-title">
            Good relationships.
            <br />
            Clear next steps.
          </h1>
          <p>
            Review accounts and prepare your next customer conversation with a simulated assistant.
          </p>
        </div>
        <Card className={s.loginPreview}>
          <Card.Header>
            <Card.Title as="h2">Your next conversation</Card.Title>
            <Card.Description>Meridian · Renewal review</Card.Description>
          </Card.Header>
          <Card.Content>
            <p>Confirm the reporting requirements with Priya before October 15.</p>
            <span className={s.health} data-health="At risk">
              Needs attention
            </span>
          </Card.Content>
        </Card>
        <p className={s.loginFootnote}>A sample app built with Unseen UI.</p>
      </section>
      <section className={s.loginForm} aria-labelledby="demo-title">
        <span className={s.demoPill}>Interactive demo</span>
        <h2 id="demo-title">Take a look around.</h2>
        <p>Use the sample workspace to try the full workflow.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              setError('Enter a display name.');
              return;
            }
            onEnter(name.trim());
          }}
        >
          <Field label="Display name" error={error || undefined} required>
            <Input
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              autoComplete="off"
            />
          </Field>
          <Field label="Demo workspace">
            <Input value="Northstar Studio" readOnly />
          </Field>
          <Button type="submit" className={s.enterButton}>
            Enter demo workspace <AIIcon name="external" />
          </Button>
        </form>
        <p className={s.demoExplanation}>
          This is a mock login. It creates no account and checks no credentials. All customer data
          and AI responses are simulated. Changes last until you reload or leave the demo.
        </p>
      </section>
    </main>
  );
}
