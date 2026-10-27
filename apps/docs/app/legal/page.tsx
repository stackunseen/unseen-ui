import Link from 'next/link';
import { DocsFrame } from '../../components/docs-frame';
import { repositoryUrl } from '../../components/github-link';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Licence, privacy and contact',
  'Unseen UI is MIT licensed. This page states what the documentation site stores in your browser, what it does not collect, and how to reach the maintainers.',
  '/legal/',
);
export default function Page() {
  return (
    <DocsFrame guide>
      <h1>Licence, privacy and contact</h1>
      <p>
        Three short answers: the code is MIT licensed, this site keeps your theme choice in your
        own browser and nothing else, and questions go to the repository.
      </p>
      <h2 id="licence">Licence</h2>
      <p>
        The packages <code>@stackunseen/ui</code> and <code>@stackunseen/ui-core</code>, the
        examples, the templates and this site’s source are released under the MIT licence,
        copyright Stack Unseen. You may use, copy, modify and redistribute them in commercial and
        private projects as long as the licence text and copyright notice stay with the code.
        The software is provided without warranty of any kind.
      </p>
      <p>
        The site self-hosts IBM Plex Sans and IBM Plex Mono under the SIL Open Font License; the
        licence text ships at <a href="/fonts/ibm-plex-sans-OFL.txt">/fonts/ibm-plex-sans-OFL.txt</a>.
        Icons come from Lucide (ISC) and Radix Icons (MIT).
      </p>
      <h2 id="privacy">Privacy</h2>
      <p>
        This site runs no analytics, sets no cookies and loads no third-party scripts. Pages are
        static files served from a content delivery network, which keeps ordinary server logs
        (request path, time and IP address) for a limited period under its own terms.
      </p>
      <p>
        Two things stay in your browser’s local storage, on your device only: the appearance and
        theme you pick in Theme Studio, and a copy of the GitHub star count for the session. The
        header fetches that count from GitHub’s public API; nothing about you is sent with the
        request beyond what any page load sends. The live examples run on sample data in the page
        and contact no model or service.
      </p>
      <h2 id="contact">Contact</h2>
      <p>
        Bugs, questions and proposals go to the{' '}
        <a href={`${repositoryUrl}/issues`} rel="noreferrer">
          issue tracker
        </a>{' '}
        on GitHub. Security reports can be opened as a private advisory on the same repository.
        For everything else, see the <Link href="/docs/">documentation overview</Link>.
      </p>
    </DocsFrame>
  );
}
