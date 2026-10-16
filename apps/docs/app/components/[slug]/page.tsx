import { notFound } from 'next/navigation';
import { Gallery } from '../../../components/gallery';
import { catalog } from '../../../lib/catalog';
import { isReleaseComponent } from '../../../lib/first-release';
import { componentHref, componentSlug } from '../../../lib/site-paths';
import { pageMetadata } from '../../../lib/site-seo';
import { componentPreview } from '../../../lib/component-previews';
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.map((entry) => ({ slug: componentSlug(entry.name) }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = catalog.find((item) => componentSlug(item.name) === slug);
  if (!entry) notFound();
  const preview = componentPreview(entry.name);
  return pageMetadata(
    `${entry.name} ${isReleaseComponent(entry) ? 'React component' : 'composition example'}`,
    `${entry.description} Explore live states, usage and props for ${entry.name}.`,
    componentHref(entry.name),
    undefined,
    preview
      ? {
          path: `${preview}-light.webp`,
          width: 480,
          height: 300,
          alt: `${entry.name} example from Unseen UI`,
        }
      : undefined,
  );
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = catalog.find((item) => componentSlug(item.name) === slug);
  if (!entry) notFound();
  return <Gallery initialComponent={entry.name} />;
}
