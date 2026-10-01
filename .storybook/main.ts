import type { StorybookConfig } from '@storybook/react-vite';
const config: StorybookConfig = {
  stories: ['../packages/react/src/**/*.stories.tsx', './stories/**/*.stories.tsx'],
  staticDirs: ['../apps/docs/public'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
};
export default config;
