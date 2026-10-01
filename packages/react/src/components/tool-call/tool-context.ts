import { createContext } from 'react';
import type { ToolCallData } from '@ai-interaction/core';

export const ToolContext = createContext<ToolCallData | null>(null);
