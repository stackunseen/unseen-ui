'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ComponentProps, ComponentType, ReactNode, SVGProps } from 'react';
import {
  ArrowTopRightIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  CodeIcon,
  ClockIcon,
  CopyIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  FileTextIcon,
  InfoCircledIcon,
  ChatBubbleIcon,
  PauseIcon,
  Pencil1Icon,
  PersonIcon,
  QuestionMarkCircledIcon,
  ReloadIcon,
  StopIcon,
  SymbolIcon,
} from '@radix-ui/react-icons';
import s from '../../shared/styles/styles.module.css';

const defaults = {
  expand: ChevronDownIcon,
  collapse: ChevronUpIcon,
  check: CheckIcon,
  close: Cross2Icon,
  send: ArrowUpIcon,
  stop: StopIcon,
  // A neutral speaker mark: sparkles and wands read as a generic "AI" decoration.
  assistant: ChatBubbleIcon,
  user: PersonIcon,
  info: InfoCircledIcon,
  tool: CodeIcon,
  document: FileTextIcon,
  warning: ExclamationTriangleIcon,
  external: ArrowTopRightIcon,
  retry: ReloadIcon,
  copy: CopyIcon,
  edit: Pencil1Icon,
  idle: CircleIcon,
  pending: ClockIcon,
  running: SymbolIcon,
  paused: PauseIcon,
  unknown: QuestionMarkCircledIcon,
};
// Less common action glyphs are supplied at their usage site to keep small
// entry points independent of the complete action catalogue.
export type IconName =
  | keyof typeof defaults
  | 'archive'
  | 'delete'
  | 'search'
  | 'moveUp'
  | 'moveDown'
  | 'helpful'
  | 'unhelpful'
  | 'microphone'
  | 'more'
  | 'attach'
  | 'sidebar'
  | 'globe'
  | 'newChat'
  | 'sun'
  | 'moon'
  | 'monitor';
export type IconComponent = ComponentType<Omit<SVGProps<SVGSVGElement>, 'children'>>;
export type IconOverrides = Partial<Record<IconName, IconComponent | null>>;
// 15px by default: the built-in Radix icons are drawn on a 15px grid, so other sizes blur their edges.
const IconContext = createContext<{ icons: IconOverrides; size: number }>({ icons: {}, size: 15 });
export interface IconsProviderProps {
  children: ReactNode;
  icons?: IconOverrides;
  size?: number;
}
/** Nested providers override only supplied roles. null hides a decorative icon. */
export function IconsProvider({ children, icons, size }: IconsProviderProps) {
  const parent = useContext(IconContext);
  const value = useMemo(
    () => ({ icons: { ...parent.icons, ...icons }, size: size ?? parent.size }),
    [parent, icons, size],
  );
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}
export interface AIIconProps extends ComponentProps<'span'> {
  name: IconName;
  icon?: IconComponent | null;
  /** A local default for a role; provider overrides still take precedence. */
  fallbackIcon?: IconComponent;
  size?: number;
  className?: string;
}
/** Decorative only: the containing control must retain its text or accessible name. */
export function AIIcon({ name, icon, fallbackIcon, size, className = '', ...rest }: AIIconProps) {
  const context = useContext(IconContext);
  const Component =
    icon === undefined
      ? context.icons[name] === undefined
        ? ((defaults as Partial<Record<IconName, IconComponent>>)[name] ?? fallbackIcon)
        : context.icons[name]
      : icon;
  if (!Component) return null;
  const dimension = size ?? context.size;
  return (
    <span {...rest} aria-hidden="true" className={`${s.icon} ${className}`} data-ai-icon={name}>
      <Component width={dimension} height={dimension} aria-hidden="true" focusable="false" />
    </span>
  );
}
