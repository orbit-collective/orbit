import type { Meta, StoryObj } from '@storybook/react-vite';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { expect, fn, userEvent, within } from 'storybook/test';
import EditorToolbar from './EditorToolbar';

function Harness({ onPickImage }: { onPickImage?: () => void }) {
    const editor = useEditor({
        content: '<p>Select some text, then press a button.</p>',
        extensions: [
            StarterKit.configure({ link: { openOnClick: false } }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
        ],
        editorProps: { attributes: { class: 'prose max-w-none text-sm' } },
    });

    if (!editor) return null;

    return (
        <div className="w-[520px] rounded-lg border border-(--border-color) bg-(--bg-color) p-3">
            <EditorToolbar
                editor={editor}
                onPickImage={onPickImage}
                className="mb-2"
            />
            <EditorContent editor={editor} />
        </div>
    );
}

const meta = {
    title: 'Molecules/EditorToolbar',
    component: Harness,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(
            await canvas.findByRole('button', { name: 'Bulleted list' }),
        );
        await expect(
            canvas.getByRole('button', { name: 'Bulleted list' }),
        ).toHaveAttribute('aria-pressed', 'true');
    },
};

/** With an uploader the bar also has the image button. */
export const WithImage: Story = {
    args: { onPickImage: fn() },
};

/** The link button swaps the bar for an address field (Enter applies, Escape closes it). */
export const LinkField: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(
            await canvas.findByRole('button', { name: 'Link' }),
        );
        await expect(
            await canvas.findByRole('textbox', { name: 'Link address' }),
        ).toBeVisible();
    },
};
