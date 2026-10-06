'use client';
import { useState } from 'react';
import { AITheme, Button, Field, Input } from '@stackunseen/ui';

export function FirstExample() {
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  return (
    <AITheme>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 360 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSavedName(name.trim());
        }}
      >
        <Field label="Your name" required>
          <Input
            name="displayName"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Button type="submit">Save locally</Button>
        <p role="status">{savedName ? `Saved locally: ${savedName}` : 'Nothing saved yet.'}</p>
      </form>
    </AITheme>
  );
}
