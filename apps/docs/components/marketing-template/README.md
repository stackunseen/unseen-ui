# Folio marketing template

A responsive website for a fictional collaborative workspace. It uses all eight
reusable marketing blocks, existing Unseen UI controls and the shared theme. The
product, project records, plans and editorial content are illustrative.

## Integration

`MarketingTemplate` is the named export in `marketing-template.tsx`. The route
wrapper imports `@stackunseen/ui/marketing.css`; the component imports its local
CSS module. No optional stylesheet import is needed in a test module.

The template expects the existing root stylesheet and `AITheme` supplied by the
site shell. It has one h1 and does not create another main landmark. The local
Folio header/footer are the example website's navigation. Their labels differ
from the surrounding documentation site's navigation.

```tsx
import { MarketingHero } from '@stackunseen/ui/marketing';
import '@stackunseen/ui/marketing.css';

<MarketingHero
  title="Bring your team's work into focus."
  description="A shared home for project notes and decisions."
  actions={<a href="#plans">Explore plans</a>}
>
  <YourProductPreview />
</MarketingHero>;
```

Use `headingLevel={2}` or `3` when embedding a hero beneath an existing page
heading. The default is `1` for a complete marketing page. Supply your own URLs,
content, actions and useful accessibility labels. Plain strings are escaped by
React; these blocks do not parse HTML, execute content or fetch remote data.

| Block             | Content and behavior                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| MarketingHeader   | Brand slot, native link records, action slot; local responsive disclosure, Escape returns focus          |
| MarketingFooter   | Brand/description, labelled native link groups, copyright and bottom content slot                        |
| MarketingHero     | Title/description/eyebrow, actions/note and visual children; configurable heading level                  |
| MarketingFeatures | Section heading, stable feature records with optional decorative icons and content slot                  |
| MarketingPricing  | Explicit display prices, features, badges and host-provided action nodes; no billing calculation         |
| MarketingFAQ      | Existing Accordion with single disclosure; optional controlled value/callback; h2 section and h3 items   |
| MarketingContact  | Native form attributes, application-owned fields/actions/submit handler/pending state and typed feedback |
| MarketingArticle  | Semantic article, section heading, metadata/actions and long-form children                               |

All block roots accept native attributes, className and style. Block-specific
types are exported from `@stackunseen/ui/marketing`. Styles are optional and
scoped to `.uim-*`; the separate optional build is owned by the integration lead.
No new package or renderer dependency is required. Existing Button, Card and
Accordion are reused inside the blocks; the template also uses Field, Input,
Textarea, Tabs and the docs application's existing Lucide dependency.

## Interactions

- The project preview's Overview/Notes tabs use real shared tab controls and
  fixed sample records. The preview has no editing or persistence.
- Selecting a sample plan updates local selection and explicitly says that no
  subscription was created. It does not create an account or take payment.
- FAQ disclosure is controlled by the template. Answers explain the example's
  scope and integration responsibilities.
- Contact fields use visible labels, native email validity, associated errors,
  first-invalid-field focus and bounded values. Submission prepares an escaped
  local draft. Nothing is transmitted or persisted; editing clears the prepared
  state. A real application must wire its own submission and delivery feedback.

## Design contract

The page explains a small-team workspace and leads to plan comparison and a
contact draft. It uses restrained Instrument Sans from the host, neutral theme
surfaces, one product preview, a split feature list, purposeful pricing cards and
an editorial article. On narrow screens navigation collapses, sections stack,
pricing becomes one column and contact fields stack. At 768px navigation and
pricing expand; at 1024px the hero and split sections use two columns.

No customer logos, fabricated reviews, adoption metrics, stock assets or paid
template code are used. Motion is not needed for this composition. Logical CSS
properties, native destinations and shared focus/interaction primitives preserve
the host's behavior. The base stylesheet is not edited by this worker.

## Focused verification

Run the two colocated test files with the workspace's Vitest command. They cover
controlled disclosure, native navigation and form forwarding, escaped content,
server rendering, heading levels, actual block use, keyboard tabs, plan selection
and draft validation. Stories cover hero, plans, controlled FAQ and host pending
contact presentation. The repository handoff records integrated evidence and
remaining checks; internal worker records are retained under `output/unseen-expansion-worker-handoffs/`.
