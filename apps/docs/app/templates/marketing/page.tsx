import { MarketingTemplate } from '../../../components/marketing-template/marketing-template';
import '@stackunseen/ui/marketing.css';
import { pageMetadata } from '../../../lib/site-seo';

export const metadata = pageMetadata(
  'Marketing website template',
  'Explore Folio, a fictional product website with responsive navigation, pricing, FAQ and a local contact form built from Unseen UI marketing blocks.',
  '/templates/marketing/',
);

export default function Page() {
  return (
    <main id="main-content" className="template-workspace" tabIndex={-1}>
      <MarketingTemplate />
    </main>
  );
}
