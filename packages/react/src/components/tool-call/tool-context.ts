import { createContext } from 'react';
import type { ToolCallData } from '@stackunseen/ui-core';
import type { DetailLevel } from '../../shared/variants.js';

export const ToolContext = createContext<ToolCallData | null>(null);
/** How much host metadata the tool parts print; ToolCall and ToolGroup provide it. */
export const ToolDetailContext = createContext<DetailLevel>('compact');
