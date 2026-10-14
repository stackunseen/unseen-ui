import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from './file-dropzone.js';

function transfer(files: File[]) {
  return { dataTransfer: { files, types: ['Files'], dropEffect: 'none' } };
}

describe('FileDropzone', () => {
  it('accepts dropped files within the limits and reports the rest', () => {
    const selected = vi.fn(),
      rejected = vi.fn();
    render(
      <FileDropzone
        accept=".txt,image/*"
        maxFileBytes={4}
        remainingSlots={1}
        onFilesSelected={selected}
        onReject={rejected}
        hint="Text or images, 4 bytes each"
      />,
    );
    const zone = screen.getByText('Drop files here').closest('[data-part="file-dropzone"]')!;
    const files = [
      new File(['ok'], 'notes.txt', { type: 'text/plain' }),
      new File(['x'], 'extra.png', { type: 'image/png' }),
      new File(['12345'], 'large.txt'),
      new File(['x'], 'no.exe'),
    ];
    fireEvent.dragEnter(zone, transfer(files));
    expect(zone).toHaveAttribute('data-dragging');
    fireEvent.drop(zone, transfer(files));
    expect(zone).not.toHaveAttribute('data-dragging');
    expect(selected).toHaveBeenCalledWith([files[0]]);
    expect(rejected.mock.calls[0]?.[0].map((item: { reason: string }) => item.reason)).toEqual([
      'count',
      'size',
      'type',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('3 files not added');
    const list = screen.getByRole('list', { name: 'Files not added' });
    expect(list).toHaveTextContent('extra.png: No attachment slots available.');
    expect(list).toHaveTextContent('large.txt: File exceeds the size limit.');
    expect(list).toHaveTextContent('no.exe: File type not accepted.');
    expect(screen.getByRole('button', { name: 'Browse files' })).toHaveAccessibleDescription(
      'Text or images, 4 bytes each',
    );
  });

  it('ignores drags that carry no files and clears the drag state when the pointer leaves', () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);
    const zone = screen.getByText('Drop files here').closest('[data-part="file-dropzone"]')!;
    fireEvent.dragEnter(zone, { dataTransfer: { files: [], types: ['text/plain'] } });
    expect(zone).not.toHaveAttribute('data-dragging');
    const files = [new File(['x'], 'x.txt')];
    fireEvent.dragEnter(zone, transfer(files));
    fireEvent.dragEnter(screen.getByRole('button', { name: 'Browse files' }), transfer(files));
    fireEvent.dragLeave(screen.getByRole('button', { name: 'Browse files' }), transfer(files));
    expect(zone).toHaveAttribute('data-dragging');
    fireEvent.dragLeave(zone, transfer(files));
    expect(zone).not.toHaveAttribute('data-dragging');
  });

  it('opens the chooser from the button and the zone, and takes one file when multiple is off', async () => {
    const selected = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <FileDropzone onFilesSelected={selected} multiple={false} label="Add a cover image" />,
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const open = vi.spyOn(input, 'click');
    expect(input).not.toHaveAttribute('multiple');
    await user.click(screen.getByRole('button', { name: 'Browse files' }));
    await user.click(screen.getByText('Add a cover image'));
    expect(open).toHaveBeenCalledTimes(2);
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    fireEvent.drop(screen.getByText('Add a cover image'), transfer(files));
    expect(selected).toHaveBeenCalledWith([files[0]]);
    fireEvent.change(input, { target: { files: [files[1]] } });
    expect(selected).toHaveBeenLastCalledWith([files[1]]);
    expect(input.value).toBe('');
  });

  it('locks when disabled, full or misconfigured and drops nothing', () => {
    const selected = vi.fn();
    const { rerender } = render(<FileDropzone remainingSlots={0} onFilesSelected={selected} />);
    const zone = screen.getByText('Drop files here').closest('[data-part="file-dropzone"]')!;
    expect(zone).toHaveAttribute('data-disabled');
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
    const files = [new File(['x'], 'x.txt')];
    fireEvent.dragEnter(zone, transfer(files));
    expect(zone).not.toHaveAttribute('data-dragging');
    fireEvent.drop(zone, transfer(files));
    expect(selected).not.toHaveBeenCalled();
    rerender(<FileDropzone maxFileBytes={NaN} onFilesSelected={selected} />);
    expect(zone).toHaveAttribute('data-disabled');
    rerender(<FileDropzone disabled onFilesSelected={selected} />);
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  });
});
