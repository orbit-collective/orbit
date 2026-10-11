import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import NotificationHeader from './NotificationHeader';

const meta = {
    title: 'Molecules/NotificationHeader',
    component: NotificationHeader,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        unreadCount: 3,
        onlyUnread: false,
        onToggleOnlyUnread: fn(),
        onMarkAllAsRead: fn(),
    },
} satisfies Meta<typeof NotificationHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('3 unread')).toBeVisible();
        await userEvent.click(canvas.getByLabelText('Mark all as read'));
        await expect(args.onMarkAllAsRead).toHaveBeenCalled();
        await userEvent.click(canvas.getByLabelText('Only show unread'));
        await expect(args.onToggleOnlyUnread).toHaveBeenCalledWith(true);
    },
};

/** With nothing unread the count is hidden and mark-all is disabled. */
export const AllRead: Story = {
    args: { unreadCount: 0 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByLabelText('Mark all as read'),
        ).toBeDisabled();
    },
};

export const OnlyUnreadActive: Story = {
    args: { onlyUnread: true },
};
