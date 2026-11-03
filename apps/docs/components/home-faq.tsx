import Link from 'next/link';

const questions = [
  {
    id: 'tailwind',
    question: 'Do I need Tailwind?',
    answer: (
      <>
        No. The package ships its own stylesheet; import it once and every component is styled.
        Colours, radius and spacing come from CSS variables, so a Tailwind project can keep its
        setup and a plain CSS project needs nothing extra. See{' '}
        <Link href="/customize/">Theme Studio</Link> for the token list.
      </>
    ),
  },
  {
    id: 'licence',
    question: 'What does it cost?',
    answer: (
      <>
        Nothing. Every component, pattern and template is MIT licensed, including the agent and
        approval pieces. There is no paid tier. The <Link href="/legal/">licence page</Link> has the
        full text.
      </>
    ),
  },
  {
    id: 'server',
    question: 'What does “your server stays in charge” mean?',
    answer: (
      <>
        A component shows the state your server reports and calls back when a person acts. An
        approval click sends a decision bound to the action version; the card shows “approved” only
        once your server acknowledges it. Nothing is marked done, sent or executed by the click
        alone, and when the answer is unknown the screen says so.
      </>
    ),
  },
  {
    id: 'backend',
    question: 'Which backends does it work with?',
    answer: (
      <>
        Any. The Chat component plugs into the Vercel AI SDK through one adapter, and every other
        component takes plain values and callbacks, so a custom API, a queue or a stand-in host
        works the same way. <Link href="/docs/integration/">Connect to your app</Link> shows the
        three shapes.
      </>
    ),
  },
  {
    id: 'accessibility',
    question: 'Is it accessible?',
    answer: (
      <>
        Keyboard and screen-reader behaviour is documented on each component page, overlays trap and
        return focus, live regions announce streaming and status changes, and reduced-motion
        preferences are respected. Automated axe checks run on the audited pages; the evidence line
        above states the last result.
      </>
    ),
  },
  {
    id: 'agents',
    question: 'Can my coding agent use it?',
    answer: (
      <>
        Yes. <a href="/llms.txt">llms.txt</a> and <a href="/llms-full.txt">llms-full.txt</a> index
        the site, every component page has a Markdown version and a “Copy prompt” button, the
        package ships a component manifest, and the MCP endpoint serves the same pages to an editor
        that supports it.
      </>
    ),
  },
  {
    id: 'stability',
    question: 'How stable is the API?',
    answer: (
      <>
        It is an experimental alpha. Pin exact versions, read the{' '}
        <Link href="/docs/changelog/">changelog</Link> before upgrading, and expect renamed props
        between prereleases. Component contracts in the core package change less often than their
        visual details.
      </>
    ),
  },
];

/** Plain disclosure elements, so the answers are in the HTML for readers and crawlers alike. */
export function HomeFaq() {
  return (
    <section className="home-faq" aria-labelledby="home-faq-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-faq-title">Questions people ask first</h2>
        </div>
      </div>
      <div className="home-faq-list">
        {questions.map((item) => (
          <details key={item.id} id={`faq-${item.id}`}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
