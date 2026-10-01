import { catalog, catalogStyles } from './catalog';

export type GalleryView = 'components' | 'workbench' | 'coding' | 'templates' | 'theme' | 'design';
export interface GalleryLocation {
  view: GalleryView;
  component: string;
  style: string;
  state: string;
  tab: 'preview' | 'code';
  compare: boolean;
  width: 'full' | '640' | '375';
}

const views: GalleryView[] = ['components', 'workbench', 'coding', 'templates', 'theme', 'design'];
const defaultEntry = catalog.find((entry) => entry.name === 'PromptInput') ?? catalog[0]!;

/** A URL is a selection request, never arbitrary props or executable fixture data. */
export function readGalleryLocation(
  search: string,
  initialView: GalleryView = 'components',
): GalleryLocation {
  const params = new URLSearchParams(search);
  const entry = catalog.find((item) => item.name === params.get('component')) ?? defaultEntry;
  const styles = catalogStyles(entry);
  const requestedView = params.get('view') as GalleryView;
  const width = params.get('width');
  return {
    view: views.includes(requestedView) ? requestedView : initialView,
    component: entry.name,
    style: styles.find((style) => style === params.get('style')) ?? styles[0]!,
    state: entry.states.find((state) => state === params.get('state')) ?? entry.states[0]!,
    tab: params.get('tab') === 'code' ? 'code' : 'preview',
    compare: params.get('compare') === 'true',
    width: width === '640' || width === '375' ? width : 'full',
  };
}

export function galleryHref(location: GalleryLocation): string {
  const params = new URLSearchParams({ view: location.view });
  if (location.view === 'components') {
    params.set('component', location.component);
    params.set('style', location.style);
    params.set('state', location.state);
    if (location.tab !== 'preview') params.set('tab', location.tab);
    if (location.compare) params.set('compare', 'true');
    if (location.width !== 'full') params.set('width', location.width);
  }
  return `?${params.toString()}`;
}

export function changeGalleryLocation(
  current: GalleryLocation,
  patch: Partial<GalleryLocation>,
): GalleryLocation {
  const next = { ...current, ...patch };
  if (patch.component && patch.component !== current.component) {
    const entry = catalog.find((item) => item.name === patch.component) ?? defaultEntry;
    next.style = catalogStyles(entry)[0]!;
    next.state = entry.states[0]!;
    next.tab = 'preview';
    next.compare = false;
  }
  return readGalleryLocation(galleryHref(next), next.view);
}
