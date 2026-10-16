'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Specimen } from './specimen';
import { ChatAiSdkSpecimen } from './chat-ai-sdk-specimen';
import { componentHref } from '../lib/site-paths';

/** Live examples for a task page: the same specimens the component pages use. */
export function TaskExamples({
  names,
  chat = false,
}: {
  names: readonly string[];
  chat?: boolean;
}) {
  const [notice, setNotice] = useState('');
  return (
    <div className="task-examples">
      {chat && (
        <figure className="task-example task-example-wide">
          <ChatAiSdkSpecimen onNotice={setNotice} height={500} />
          <figcaption>
            <span>Chat on a simulated AI SDK chat. {notice}</span>
            <Link href="/patterns/ai-sdk-chat/">The full recipe</Link>
          </figcaption>
        </figure>
      )}
      {names.map((name) => (
        <figure className="task-example" key={name}>
          <div className="task-example-stage">
            <Specimen name={name} />
          </div>
          <figcaption>
            <span>{name}</span>
            <Link href={componentHref(name)}>States, props and code</Link>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
