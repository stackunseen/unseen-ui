import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeTabs } from './code-tabs.js';
import type { CodeFile, CodeTourStop } from './code-tabs.js';

const files: CodeFile[] = [
  {
    file: 'app.py',
    language: 'python',
    label: 'Entry point',
    code: 'import os\nfrom tools import run\n\n\ndef main() -> None:\n    config = os.environ.get("MODE", "dev")\n    run(config)\n\n\nif __name__ == "__main__":\n    main()\n',
  },
  {
    file: 'tools.py',
    language: 'python',
    label: 'Helpers',
    code: 'def run(mode: str) -> int:\n    print(f"running in {mode}")\n    return 0\n',
  },
  { file: 'README.md', language: 'markdown', code: '# Example\n\nRun `python app.py`.\n' },
];
const tour: CodeTourStop[] = [
  {
    file: 'app.py',
    start: 5,
    end: 7,
    title: 'The entry point',
    note: 'Reads the mode and hands it to the helper.',
  },
  {
    file: 'tools.py',
    start: 1,
    end: 3,
    title: 'The helper',
    note: 'Prints the mode and returns an exit code.',
  },
  { file: 'app.py', start: 10, end: 11, title: 'Running it', note: 'The usual guard.' },
];

const meta = {
  title: 'Unseen UI/CodeTabs',
  component: CodeTabs,
  args: { files, label: 'Example files' },
} satisfies Meta<typeof CodeTabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Files: Story = {};
export const WithTour: Story = { args: { tour, hashLinks: 'tour-', copy: true } };
export const SingleFile: Story = { args: { files: [files[2]!], copy: true } };
