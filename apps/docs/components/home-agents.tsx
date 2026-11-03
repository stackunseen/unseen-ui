import Link from 'next/link';
import { HomeConnectCode } from './home-connect-code';

const files = [
  {
    file: 'terminal',
    label: 'Claude Code',
    language: 'sh',
    code: `claude mcp add --transport http unseen-ui https://unseenui.com/api/mcp

# Then, in a session:
# "Add an approval card to the assistant page using Unseen UI."`,
  },
  {
    file: 'mcp.json',
    label: 'Cursor and others',
    language: 'json',
    code: `{
  "mcpServers": {
    "unseen-ui": { "url": "https://unseenui.com/api/mcp" }
  }
}`,
  },
  {
    file: 'prompt.md',
    label: 'Copy prompt',
    language: 'md',
    code: `Add the ApprovalCard component from Unseen UI (@stackunseen/ui) to this project.

Follow the documentation below exactly: install the package, import the
stylesheet once, use the import path shown, pass the props as described, and
keep the component controlled by my application state. Do not mark an action
as done unless my server confirms it.

---

# ApprovalCard
…the full page, with every prop`,
  },
] as const;

/** Homepage: the three ways a coding agent reads this library, with the exact setup for each. */
export function HomeAgents() {
  return (
    <section className="home-connect home-agents" aria-labelledby="home-agents-title">
      <div className="home-connect-copy">
        <h2 id="home-agents-title">Built for coding agents, not just for copying.</h2>
        <p>
          Connect the MCP endpoint once and your agent searches the catalog and reads any component
          page with every prop. Or press Copy prompt on a page and paste it into Claude, Cursor,
          ChatGPT or v0.
        </p>
        <ul>
          <li>
            <Link href="/docs/coding-agents/">Set up the MCP endpoint</Link>
          </li>
          <li>
            <a href="/llms.txt">llms.txt and a Markdown page per component</a>
          </li>
          <li>
            <Link href="/components/approval-card/">Try Copy prompt on ApprovalCard</Link>
          </li>
        </ul>
        <p className="home-connect-note">
          The endpoint serves the same files as the site, so the agent never reads a stale page. No
          key, no account.
        </p>
      </div>
      <HomeConnectCode className="home-connect-code" label="Agent setup" files={files} />
    </section>
  );
}
