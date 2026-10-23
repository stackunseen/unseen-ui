'use client';
import { useState } from 'react';
import { Tabs } from '@stackunseen/ui';
import { ChatAiSdkSpecimen } from '../chat-ai-sdk-specimen';
import { CodePanel } from '../code-panel';

/** The live demo beside the code a host writes, with the simulated host's decisions narrated. */
export function AiSdkChatRecipe({
  client,
  server,
  wording,
}: {
  client: string;
  server: string;
  wording: string;
}) {
  const [notice, setNotice] = useState(
    'Approve or reject the archive request to see what happens next.',
  );
  const [tab, setTab] = useState('client');
  return (
    <div className="ai-sdk-recipe">
      <section className="ai-sdk-recipe-demo" aria-label="Live example">
        <ChatAiSdkSpecimen onNotice={setNotice} height={540} />
        <p className="ai-sdk-recipe-notice" role="status">
          {notice}
        </p>
      </section>
      <section className="ai-sdk-recipe-code" aria-label="Code">
        <Tabs
          label="Code"
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: 'client',
              label: 'Client',
              content: <CodePanel>{client}</CodePanel>,
            },
            {
              value: 'server',
              label: 'Server route',
              content: <CodePanel>{server}</CodePanel>,
            },
            {
              value: 'wording',
              label: 'Your wording and views',
              content: <CodePanel>{wording}</CodePanel>,
            },
          ]}
        />
        <ol className="ai-sdk-recipe-steps">
          <li>
            The model calls a tool marked <code>needsApproval</code>; the SDK streams an approval
            request.
          </li>
          <li>Chat shows the tool card and an approval card with the server&apos;s reason.</li>
          <li>
            Approve or Reject calls <code>addToolApprovalResponse</code> with the approval id.
          </li>
          <li>The card stays locked until the tool runs or is denied, then reads acknowledged.</li>
        </ol>
      </section>
    </div>
  );
}
