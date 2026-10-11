import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Modal from './Modal';

const meta = {
    title: 'Atoms/Modal',
    component: Modal,
    parameters: { layout: 'fullscreen' },
    args: {
        isOpen: true,
        onClose: fn(),
        children: (
            <div className="p-6 text-[var(--text-color)]">
                <h2 className="mb-2 text-lg font-semibold">Delete project</h2>
                <p className="text-sm text-[var(--text-gray-color)]">
                    This removes the project and all of its issues.
                </p>
            </div>
        ),
    },
    argTypes: {
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Closed: Story = {
    args: { isOpen: false },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByText('Delete project'),
        ).not.toBeInTheDocument();
    },
};

export const ClosesOnEscape: Story = {
    play: async ({ args }) => {
        await userEvent.keyboard('{Escape}');
        await expect(args.onClose).toHaveBeenCalled();
    },
};

export const ClosesOnBackdropClick: Story = {
    play: async ({ args, canvasElement }) => {
        const content = within(canvasElement).getByText('Delete project');
        await userEvent.click(content);
        await expect(args.onClose).not.toHaveBeenCalled();
        await userEvent.click(
            content.parentElement!.parentElement!.parentElement!,
        );
        await expect(args.onClose).toHaveBeenCalledTimes(1);
    },
};
