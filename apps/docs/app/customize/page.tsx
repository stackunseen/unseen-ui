import { Gallery } from '../../components/gallery';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Theme Studio',
  'Preview and customize Unseen UI colors, density, appearance, icons, borders and corners. Export CSS, TypeScript or versioned theme JSON.',
  '/customize/',
);
export default function Page() {
  return <Gallery initialView="theme" />;
}
