import { Gallery } from '../../components/gallery';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Design foundations',
  'Explore Unseen UI design foundations, semantic colors, controls, type and application composition with scoped theme previews.',
  '/design/',
);
export default function Page() {
  return <Gallery initialView="design" />;
}
