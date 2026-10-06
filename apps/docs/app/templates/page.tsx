import { Templates } from '../../components/templates';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Application templates',
  'Try Workbench, Coding Studio, SaaS Admin and Marketing in the browser, or run Relay locally. Application templates built with Unseen UI and sample data.',
  '/templates/',
);
export default function Page() {
  return (
    <main id="main-content" className="web-container templates-page" tabIndex={-1}>
      <Templates />
    </main>
  );
}
