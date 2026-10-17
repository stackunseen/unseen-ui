'use client';
import type { ReactNode } from 'react';
import { AITheme } from '@stackunseen/ui';
import { createTheme } from '@stackunseen/ui/theme';
import '@stackunseen/ui/styles.css';

/**
 * The Unseen UI theme for everything inside it. Change the seeds, or replace createTheme(...)
 * with importTheme(json) using a theme exported from https://unseenui.com/customize/.
 */
const theme = createTheme({ primary: '#171717', radius: 12, controlRadius: 10 });

export function UnseenTheme({ children }: { children: ReactNode }) {
  return (
    <AITheme theme={theme} appearance="system">
      {children}
    </AITheme>
  );
}
