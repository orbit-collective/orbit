import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ModalOrg } from './Modal';

const meta = {
    title: 'Organisms/Modal',
    component: ModalOrg,
    parameters: { layout: 'fullscreen' },
    args: {
        modal: {
            id: 'modal-1',
            title: 'Delete project',
            description: 'This action cannot be undone.',
            children: (
                <p className="text-sm text-[var(--text-color)]">
                    All issues, comments and labels in this project will be
                    permanently removed.
                </p>
            ),
        },
        onClose: fn(),
    },
} satisfies Meta<typeof ModalOrg>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args }) => {
        const body = within(document.body);
        await userEvent.click(await body.findByRole('button'));
        await expect(args.onClose).toHaveBeenCalledWith('modal-1');
    },
};

export const WithoutDescription: Story = {
    args: {
        modal: {
            id: 'modal-2',
            title: 'Rename project',
            children: (
                <p className="text-sm text-[var(--text-color)]">
                    Pick a new name for the project.
                </p>
            ),
        },
    },
};

export const LongContent: Story = {
    args: {
        modal: {
            id: 'modal-3',
            title: 'Release notes',
            description: 'Everything that changed in 0.10.',
            children: (
                <ul className="flex flex-col gap-2 text-sm text-[var(--text-color)]">
                    {Array.from({ length: 30 }, (_, index) => (
                        <li key={index}>
                            Change number {index + 1}: a fix or improvement
                            worth reading about.
                        </li>
                    ))}
                </ul>
            ),
        },
    },
};
