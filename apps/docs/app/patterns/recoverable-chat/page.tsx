import { ExamplePage } from '../../../components/example-page';
import { RecoveryRecipe } from '../../../components/ai-recipes/recovery/recovery-recipe';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Recoverable chat recipe',
  'Try disconnect, unknown submission and original receipt recovery in a local chat recipe built with Unseen UI. No model or network service is connected.',
  '/patterns/recoverable-chat/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Recoverable chat"
      description="Keep the local draft while you resolve connection and submission state."
      backHref="/patterns/"
      backLabel="All AI recipes"
    >
      <RecoveryRecipe />
    </ExamplePage>
  );
}
