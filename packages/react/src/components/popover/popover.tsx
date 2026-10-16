'use client';
import { Children, isValidElement, useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-popover';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import controls from '../../shared/styles/styles.module.css';
import s from '../../shared/styles/overlays.module.css';
import { OverlayDirection, useOverlayDirection } from '../../shared/overlay-direction.js';

export interface PopoverProps extends ComponentProps<typeof Primitive.Root> {
  /** Set for locally scoped RTL layouts so the portal and trigger share direction. */
  dir?: 'ltr' | 'rtl';
}
export type PopoverTriggerProps = ComponentProps<typeof Primitive.Trigger> & {
  /** Button presentation of the trigger; ignored with `asChild`. */
  variant?: 'outline' | 'ghost';
  size?: 'default' | 'sm';
};
export type PopoverCloseProps = ComponentProps<typeof Primitive.Close>;
export interface PopoverContentProps extends Omit<
  ComponentProps<typeof Primitive.Content>,
  'title' | 'asChild'
> {
  /** A visible heading also supplies the dialog's accessible name. */
  title: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  description?: ReactNode;
  /** Defaults to the originating document body; scope is preserved in either case. */
  container?: ComponentProps<typeof Primitive.Portal>['container'];
}

export function PopoverTrigger({
  asChild,
  dir,
  className = '',
  variant = 'outline',
  size,
  ...props
}: PopoverTriggerProps) {
  const direction = useOverlayDirection(dir);
  return (
    <Primitive.Trigger
      {...props}
      dir={direction}
      asChild={asChild}
      className={`${asChild ? '' : controls.button} ${className}`}
      data-variant={variant}
      data-size={size}
    />
  );
}

/** Portals, labels and constrains an interactive popover; Radix owns focus and dismissal. */
export function PopoverContent({
  title,
  headingLevel = 2,
  description,
  children,
  container,
  forceMount,
  className = '',
  sideOffset = 8,
  collisionPadding = 12,
  dir,
  ...props
}: PopoverContentProps) {
  const id = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const direction = useOverlayDirection(dir);
  const hasDescription = description !== undefined && description !== null;
  // Keep direct Arrow parts outside the scrollport so constrained content does not clip them.
  const parts = Children.toArray(children);
  const isArrow = (part: ReactNode) => isValidElement(part) && part.type === PopoverArrow;
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <ThemeSurface>
        <Primitive.Content
          aria-labelledby={`${id}-title`}
          aria-describedby={hasDescription ? `${id}-description` : undefined}
          {...props}
          dir={direction}
          forceMount={forceMount}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={`${s.surface} ${s.popover} ${className}`}
        >
          <div className={s.popoverBody}>
            <Heading id={`${id}-title`} className={s.title}>
              {title}
            </Heading>
            {hasDescription && (
              <p id={`${id}-description`} className={s.description}>
                {description}
              </p>
            )}
            {parts.filter((part) => !isArrow(part))}
          </div>
          {parts.filter(isArrow)}
        </Primitive.Content>
      </ThemeSurface>
    </Primitive.Portal>
  );
}

export function PopoverClose({ asChild, className = '', ...props }: PopoverCloseProps) {
  return (
    <Primitive.Close
      {...props}
      asChild={asChild}
      className={`${asChild ? '' : controls.button} ${className}`}
      data-variant="outline"
    />
  );
}

export function PopoverArrow({ className = '', ...props }: ComponentProps<typeof Primitive.Arrow>) {
  return <Primitive.Arrow {...props} aria-hidden="true" className={`${s.arrow} ${className}`} />;
}

function PopoverRoot({ dir, children, ...props }: PopoverProps) {
  const direction = useOverlayDirection(dir) as 'ltr' | 'rtl' | undefined;
  return (
    <OverlayDirection.Provider value={direction}>
      <Primitive.Root {...props}>{children}</Primitive.Root>
    </OverlayDirection.Provider>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Anchor: Primitive.Anchor,
  Content: PopoverContent,
  Close: PopoverClose,
  Arrow: PopoverArrow,
});
