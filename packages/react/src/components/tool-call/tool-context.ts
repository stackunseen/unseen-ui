import { createContext } from 'react';
import type { ToolCallData } from '@stackunseen/ui-core';

export const ToolContext = createContext<ToolCallData | null>(null);
