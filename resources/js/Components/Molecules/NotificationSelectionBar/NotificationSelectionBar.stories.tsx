import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import NotificationSelectionBar from './NotificationSelectionBar';

const meta = {
    title: 'Molecules/NotificationSelectionBar',
    component: NotificationSelectionBar,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        selectedCount: 2,
        totalCount: 5,
        onToggleAll: fn(),
        onMarkAsRead: fn(),
        onDelete: fn(),
        onCancel: fn(),
    },
} satisfies Meta<typeof NotificationSelectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /delete/i }));
        await expect(args.onDelete).toHaveBeenCalled();
    },
};

/** Nothing selected yet: the bulk actions are disabled. */
export const NothingSelected: Story = {
    args: { selectedCount: 0 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: /mark read/i }),
        ).toBeDisabled();
    },
};

export const AllSelected: Story = {
    args: { selectedCount: 5 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Clear selection'),
        ).toBeVisible();
    },
};
