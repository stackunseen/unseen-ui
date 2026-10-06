import { ExamplePage } from '../../../components/example-page';
import { ActionReceiptRecipe } from '../../../components/ai-recipes/actions/action-receipt-recipe';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Approval and action receipts recipe',
  'Follow a version-bound approval through host acceptance, partial failure and receipt reconciliation in a local Unseen UI recipe. No external action runs.',
  '/patterns/action-receipts/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Approval and action receipts"
      description="Follow a reviewed action through host acceptance and a reported result."
      backHref="/patterns/"
      backLabel="All AI recipes"
    >
      <ActionReceiptRecipe />
    </ExamplePage>
  );
}
