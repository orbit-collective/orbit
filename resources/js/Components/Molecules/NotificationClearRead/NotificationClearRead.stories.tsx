import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import NotificationClearRead from './NotificationClearRead';

const meta = {
    title: 'Molecules/NotificationClearRead',
    component: NotificationClearRead,
    parameters: { layout: 'centered' },
    args: { onConfirm: fn() },
} satisfies Meta<typeof NotificationClearRead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Deleting takes a second click, since it cannot be undone. */
export const Confirming: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByText('Delete all read'));
        await userEvent.click(canvas.getByText('Delete'));
        await expect(args.onConfirm).toHaveBeenCalled();
    },
};
