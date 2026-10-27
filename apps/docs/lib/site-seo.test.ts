import { describe, expect, it } from 'vitest';
import {
  indexablePaths,
  pageMetadata,
  parseSiteOrigin,
  releasePagePaths,
  staticPaths,
} from './site-seo';
import { releaseCatalog, compositionCatalog } from './first-release';
import { componentHref } from './site-paths';
describe('production origin and route metadata', () => {
  it('leaves unknown origins absent and validates configured HTTPS origins', () => {
    expect(parseSiteOrigin(undefined)).toBeUndefined();
    expect(parseSiteOrigin('  ')).toBeUndefined();
    expect(parseSiteOrigin('https://site.test/')).toBe('https://site.test');
    for (const value of [
      'http://site.test',
      'https://site.test/docs',
      'https://site.test/?x=1',
      'https://user:pass@site.test/',
      'https://127.0.0.1/',
      'https://localhost/',
    ])
      expect(() => parseSiteOrigin(value)).toThrow();
  });
  it('omits guessed canonical and social origin when not configured', () => {
    const metadata = pageMetadata('Input', 'Input description', '/components/input/', undefined);
    expect(metadata.title).toEqual({ absolute: 'Input | Unseen UI' });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(indexablePaths).toHaveLength(releaseCatalog.length + releasePagePaths.length);
    expect(new Set(indexablePaths).size).toBe(indexablePaths.length);
    expect(indexablePaths).toContain('/templates/saas-admin/');
    expect(indexablePaths).not.toContain('/templates/marketing/');
    expect(staticPaths).toContain('/templates/marketing/');
    expect(staticPaths).toContain('/patterns/action-receipts/');
    for (const entry of compositionCatalog)
      expect(indexablePaths).not.toContain(componentHref(entry.name));
    expect(indexablePaths).toHaveLength(185);
  });
  it('uses the verified origin for canonical and social URLs', () => {
    const metadata = pageMetadata(
      'Input',
      'Input description',
      '/components/input/',
      'https://site.test',
    );
    expect(metadata.alternates).toEqual({ canonical: 'https://site.test/components/input/' });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      url: 'https://site.test/components/input/',
      images: [
        {
          url: 'https://site.test/social-preview.png',
          width: 1200,
          height: 630,
          alt: expect.any(String),
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });
  it('keeps additional examples canonical and followable without promoting them in launch indexing', () => {
    for (const path of [
      '/templates/',
      '/templates/marketing/',
      '/patterns/action-receipts/',
      ...compositionCatalog.map((entry) => componentHref(entry.name)),
    ]) {
      const metadata = pageMetadata(
        'Additional example',
        'Example description',
        path,
        'https://site.test',
      );
      expect(metadata.alternates).toEqual({ canonical: `https://site.test${path}` });
      expect(metadata.robots).toEqual({ index: false, follow: true });
    }
  });
});
