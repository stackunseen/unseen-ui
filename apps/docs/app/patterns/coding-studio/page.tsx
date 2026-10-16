import { ExamplePage } from '../../../components/example-page';
import { CodingStudio } from '../../../components/coding-studio';
import '@stackunseen/ui/terminal.css';
import '@stackunseen/ui/editor.css';
import '@stackunseen/ui/artifact-editor.css';
import '@stackunseen/ui/conversation-flow.css';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Coding Studio',
  'Explore a sample coding workspace with files, code changes and local execution states built from Unseen UI components.',
  '/patterns/coding-studio/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Coding Studio"
      description="Edit sample files, stage changes and apply a reviewed patch in a local workspace."
      backHref="/patterns/"
      backLabel="All patterns"
      workspace
    >
      <CodingStudio showIntroduction={false} />
    </ExamplePage>
  );
}
