import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FileDropzone } from './file-dropzone.js';
import { Attachment, AttachmentGroup } from '../attachment/attachment.js';

const meta = {
  title: 'Unseen UI/FileDropzone',
  component: FileDropzone,
  args: {
    onFilesSelected: () => {},
    accept: 'image/*,.pdf,.txt',
    maxFileBytes: 5 * 1024 * 1024,
    hint: 'Images, PDF or text, up to 5 MiB each',
  },
} satisfies Meta<typeof FileDropzone>;
export default meta;
type Story = StoryObj<typeof meta>;

function Picker(props: Omit<Parameters<typeof FileDropzone>[0], 'onFilesSelected'>) {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <FileDropzone
      {...props}
      remainingSlots={3 - files.length}
      onFilesSelected={(picked) => setFiles((previous) => [...previous, ...picked])}
    >
      {files.length > 0 && (
        <AttachmentGroup label="Chosen files" variant="inline">
          {files.map((file, index) => (
            <Attachment
              key={`${index}:${file.name}`}
              variant="compact"
              name={file.name}
              state="selected"
              sizeBytes={file.size}
              mediaType={file.type}
              onRemove={() => setFiles((previous) => previous.filter((_, i) => i !== index))}
            />
          ))}
        </AttachmentGroup>
      )}
    </FileDropzone>
  );
}

export const Default: Story = { render: (args) => <Picker {...args} /> };
export const SingleFile: Story = {
  render: (args) => (
    <Picker {...args} multiple={false} label="Add a cover image" accept="image/*" />
  ),
};
export const Disabled: Story = { args: { disabled: true } };
export const Full: Story = {
  args: { remainingSlots: 0, hint: 'All three attachment slots are in use.' },
};
