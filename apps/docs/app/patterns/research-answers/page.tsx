import { ExamplePage } from '../../../components/example-page';
import { ResearchRecipe } from '../../../components/ai-recipes/research/research-recipe';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Research answers recipe',
  'Inspect claim-linked evidence, source availability and supplied freshness in a local research-answer recipe built from Unseen UI components.',
  '/patterns/research-answers/',
);
export default function Page() {
  return (
    <ExamplePage
      title="Research answers"
      description="Read an answer with the evidence supplied for each claim."
      backHref="/patterns/"
      backLabel="All AI recipes"
    >
      <ResearchRecipe />
    </ExamplePage>
  );
}
