import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import DashboardEditorBar from './DashboardEditorBar';

const meta = {
    title: 'Molecules/DashboardEditorBar',
    component: DashboardEditorBar,
    parameters: { layout: 'padded' },
    args: {
        dirty: true,
        saving: false,
        snap: true,
        onSnapChange: fn(),
        onSave: fn(),
        onCancel: fn(),
        onReset: fn(),
    },
} satisfies Meta<typeof DashboardEditorBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Save' }),
        );
        await expect(args.onSave).toHaveBeenCalled();
    },
};

export const Unchanged: Story = { args: { dirty: false } };

export const Saving: Story = { args: { saving: true } };

export const FreeResize: Story = { args: { snap: false } };

/** Reset asks once more before it runs. */
export const ConfirmingReset: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Reset' }),
        );
        await expect(
            within(canvasElement).getByText('Back to the default layout?'),
        ).toBeVisible();
    },
};
