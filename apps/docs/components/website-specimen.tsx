'use client';
import dynamic from 'next/dynamic';
import { ExampleLoading } from './example-loading';

export interface WebsiteSpecimenProps {
  name: string;
  state: string;
  presentation?: string;
}
const FormSpecimen = dynamic(
  () => import('./website-form-specimen').then((m) => m.WebsiteFormSpecimen),
  { loading: ExampleLoading },
);
const OverlaySpecimen = dynamic(
  () => import('./website-overlay-specimen').then((m) => m.WebsiteOverlaySpecimen),
  { loading: ExampleLoading },
);
const MenuSpecimen = dynamic(
  () => import('./website-menu-specimen').then((m) => m.WebsiteMenuSpecimen),
  { loading: ExampleLoading },
);
const FeedbackSpecimen = dynamic(
  () => import('./website-feedback-specimen').then((m) => m.WebsiteFeedbackSpecimen),
  { loading: ExampleLoading },
);
const NavigationSpecimen = dynamic(
  () => import('./website-navigation-specimen').then((m) => m.WebsiteNavigationSpecimen),
  { loading: ExampleLoading },
);
const SurfaceSpecimen = dynamic(
  () => import('./website-surface-specimen').then((m) => m.WebsiteSurfaceSpecimen),
  { loading: ExampleLoading },
);
const DisplaySpecimen = dynamic(
  () => import('./website-display-specimen').then((m) => m.WebsiteDisplaySpecimen),
  { loading: ExampleLoading },
);
const ControlSpecimen = dynamic(
  () => import('./website-control-specimen').then((m) => m.WebsiteControlSpecimen),
  { loading: ExampleLoading },
);
const UtilitySpecimen = dynamic(
  () => import('./website-utility-specimen').then((m) => m.WebsiteUtilitySpecimen),
  { loading: ExampleLoading },
);

export function WebsiteSpecimen(props: WebsiteSpecimenProps) {
  const { name } = props;
  const Component = [
    'Field',
    'Input',
    'Textarea',
    'Checkbox',
    'Switch',
    'RadioGroup',
    'Slider',
  ].includes(name)
    ? FormSpecimen
    : ['Popover', 'Tooltip', 'AlertDialog'].includes(name)
      ? OverlaySpecimen
      : ['DropdownMenu', 'ContextMenu', 'NavigationMenu'].includes(name)
        ? MenuSpecimen
        : ['Alert', 'EmptyState', 'Progress', 'Toast'].includes(name)
          ? FeedbackSpecimen
          : ['Breadcrumb', 'Pagination', 'Sidebar'].includes(name)
            ? NavigationSpecimen
            : ['LinkButton', 'ToggleGroup', 'Tag', 'Avatar', 'Stat', 'LinkCard'].includes(name)
              ? DisplaySpecimen
              : ['SegmentedControl', 'Chip', 'Stepper', 'Matrix'].includes(name)
                ? ControlSpecimen
                : [
                      'CopyButton',
                      'InputGroup',
                      'AppearanceToggle',
                      'CommandPalette',
                      'TableOfContents',
                      'ShareMenu',
                    ].includes(name)
                  ? UtilitySpecimen
                  : SurfaceSpecimen;
  return (
    <div className="generic-demo" data-demo={name}>
      <Component {...props} />
    </div>
  );
}
