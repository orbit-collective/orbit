import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import ModalFooter from './ModalFooter';

const meta = {
    title: 'Molecules/ModalFooter',
    component: ModalFooter,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px] rounded-xl bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
    args: { onCancel: fn() },
} satisfies Meta<typeof ModalFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Cancel' }),
        );
        await expect(args.onCancel).toHaveBeenCalled();
    },
};

export const CustomLabels: Story = {
    args: { submitLabel: 'Create project', cancelLabel: 'Discard' },
};

export const Submitting: Story = {
    args: { isSubmitting: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Creating...' }),
        ).toBeDisabled();
    },
};

/** Children replace the default cancel/submit pair entirely. */
export const CustomChildren: Story = {
    args: {
        children: (
            <span className="text-sm text-[var(--text-gray-color)]">
                Custom footer content
            </span>
        ),
    },
};
