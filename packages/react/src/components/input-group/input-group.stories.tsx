import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputGroup, InputGroupAddon, InputGroupButton } from './input-group.js';
import { Field } from '../field/field.js';
import { Input } from '../input/input.js';
import { CopyButton } from '../copy-button/copy-button.js';

const meta = {
  title: 'Unseen UI/InputGroup',
  component: InputGroup,
} satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function SignUp() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setStatus(`Subscribed ${email}`);
      }}
      style={{ maxWidth: 480 }}
    >
      <Field label="Email address" description="One email when a new entry lands.">
        <InputGroup shape="pill" size="touch">
          <Input
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <InputGroupButton type="submit">Subscribe</InputGroupButton>
        </InputGroup>
      </Field>
      <p role="status">{status}</p>
    </form>
  );
}
export const PillSignUp: Story = { render: () => <SignUp /> };
export const SearchWithButton: Story = {
  render: () => (
    <InputGroup attach="inset" style={{ maxWidth: 420 }}>
      <InputGroupAddon>🔍</InputGroupAddon>
      <Input type="search" placeholder="Search the journal" aria-label="Search the journal" />
      <InputGroupButton variant="outline">Search</InputGroupButton>
    </InputGroup>
  ),
};
export const ValueWithCopy: Story = {
  render: () => (
    <InputGroup style={{ maxWidth: 420 }}>
      <Input readOnly value="npm install @stackunseen/ui@alpha" aria-label="Install command" />
      <CopyButton value="npm install @stackunseen/ui@alpha" label="Copy" variant="ghost" />
    </InputGroup>
  ),
};
export const Invalid: Story = {
  render: () => (
    <Field label="Code" error="Enter the six digits from the email." style={{ maxWidth: 320 }}>
      <InputGroup>
        <Input inputMode="numeric" />
        <InputGroupButton variant="outline">Verify</InputGroupButton>
      </InputGroup>
    </Field>
  ),
};
