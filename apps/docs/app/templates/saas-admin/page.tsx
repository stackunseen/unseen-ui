import { SaaSAdmin } from '../../../components/saas-admin/saas-admin';
import '@stackunseen/ui/application.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'SaaS admin example',
  'Try a working local admin app with customer records, members, organization settings and sample billing. Built with controlled Unseen UI components and compositions.',
  '/templates/saas-admin/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace template-app-mode" tabIndex={-1}>
      <a className="web-text-link template-workspace-back" href="/patterns/">
        All patterns
      </a>
      <header className="template-workspace-heading">
        <h1>SaaS admin</h1>
        <p>
          Customer records, members, organization settings and sample billing in one local
          workspace.
        </p>
      </header>
      <SaaSAdmin />
    </main>
  );
}
