import type { Preview } from '@storybook/react-vite';
import { AITheme } from '../packages/react/dist/index.js';
import '../packages/react/dist/styles.css';
import 'katex/dist/katex.min.css';
const preview: Preview = {
  decorators: [
    (Story) => (
      <AITheme>
        <Story />
      </AITheme>
    ),
  ],
  parameters: { layout: 'padded' },
};
export default preview;
