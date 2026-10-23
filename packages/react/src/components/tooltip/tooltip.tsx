'use client';
import { Children, createContext, isValidElement, useContext } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-tooltip';
import { useThemeScope } from '../../providers/theme/theme-provider.js';
import controls from '../../shared/styles/styles.module.css';
import s from '../../shared/styles/overlays.module.css';
import m from '../../shared/styles/motion.module.css';
import { OverlayDirection, useOverlayDirection } from '../../shared/overlay-direction.js';

const ProviderContext = createContext(false);
export type TooltipProviderProps = ComponentProps<typeof Primitive.Provider>;
export interface TooltipProps extends ComponentProps<typeof Primitive.Root> {
  /** Set for locally scoped RTL layouts so the portal and trigger share direction. */
  dir?: 'ltr' | 'rtl';
}
export type TooltipTriggerProps = ComponentProps<typeof Primitive.Trigger>;
export interface TooltipContentProps extends Omit<
  ComponentProps<typeof Primitive.Content>,
  'asChild'
> {
  container?: ComponentProps<typeof Primitive.Portal>['container'];
}

/** Share hover delays across a group; a standalone Tooltip supplies its own provider. */
export function TooltipProvider({ children, delayDuration = 400, ...props }: TooltipProviderProps) {
  return (
    <ProviderContext.Provider value>
      <Primitive.Provider {...props} delayDuration={delayDuration}>
        {children}
      </Primitive.Provider>
    </ProviderContext.Provider>
  );
}

function TooltipRoot({ dir, ...props }: TooltipProps) {
  const hasProvider = useContext(ProviderContext);
  const direction = useOverlayDirection(dir) as 'ltr' | 'rtl' | undefined;
  return (
    <OverlayDirection.Provider value={direction}>
      {hasProvider ? (
        <Primitive.Root {...props} />
      ) : (
        <TooltipProvider>
          <Primitive.Root {...props} />
        </TooltipProvider>
      )}
    </OverlayDirection.Provider>
  );
}

export function TooltipTrigger({ asChild, dir, className = '', ...props }: TooltipTriggerProps) {
  const direction = useOverlayDirection(dir);
  return (
    <Primitive.Trigger
      {...props}
      dir={direction}
      asChild={asChild}
      className={`${asChild ? '' : controls.button} ${className}`}
      data-variant="outline"
    />
  );
}

/** Non-interactive supplementary text. Keep essential labels/instructions visible. */
export function TooltipContent({
  children,
  container,
  forceMount,
  className = '',
  sideOffset = 6,
  collisionPadding = 12,
  dir,
  ...props
}: TooltipContentProps) {
  const direction = useOverlayDirection(dir);
  const parts = Children.toArray(children);
  const isArrow = (part: ReactNode) => isValidElement(part) && part.type === TooltipArrow;
  const theme = useThemeScope();
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <Primitive.Content
        {...props}
        dir={direction}
        forceMount={forceMount}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        {...theme.attributes}
        className={`${theme.scope} ${s.surface} ${s.tooltip} ${m.pop} ${className}`}
      >
        <div className={s.tooltipBody}>{parts.filter((part) => !isArrow(part))}</div>
        {parts.filter(isArrow)}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function TooltipArrow({ className = '', ...props }: ComponentProps<typeof Primitive.Arrow>) {
  return <Primitive.Arrow {...props} aria-hidden="true" className={`${s.arrow} ${className}`} />;
}

export const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow,
});
