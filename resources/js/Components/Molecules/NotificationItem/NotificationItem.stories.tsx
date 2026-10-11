import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { notifications } from '@/stories/fixtures';
import NotificationItem from './NotificationItem';

const meta = {
    title: 'Molecules/NotificationItem',
    component: NotificationItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[380px]">
                <Story />
            </div>
        ),
    ],
    args: {
        notification: { ...notifications[0], read: false },
        onMarkAsRead: fn(),
        onRemove: fn(),
    },
} satisfies Meta<typeof NotificationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unread: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTitle('Mark as read'));
        await expect(args.onMarkAsRead).toHaveBeenCalledWith(
            args.notification.id,
        );
        await userEvent.click(canvas.getByLabelText('Delete notification'));
        await expect(args.onRemove).toHaveBeenCalledWith(args.notification.id);
    },
};

export const Read: Story = {
    args: { notification: { ...notifications[0], read: true } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Read')).toBeVisible();
    },
};

/** One story per notification type shows the colored status dot. */
export const Types: Story = {
    render: (args) => (
        <div className="flex flex-col divide-y divide-[var(--border-color)]">
            {(['success', 'info', 'warning', 'error'] as const).map((type) => (
                <NotificationItem
                    key={type}
                    {...args}
                    notification={{
                        ...notifications[0],
                        type,
                        title: `A ${type} notification`,
                    }}
                />
            ))}
        </div>
    ),
};

export const WithoutMessageOrAction: Story = {
    args: {
        notification: {
            ...notifications[0],
            message: '',
            action_url: '',
        },
    },
};

export const LongContent: Story = {
    args: {
        notification: {
            ...notifications[0],
            title: 'A notification title that is far too long to fit on one line',
            message:
                'Averyveryverylongunbrokenwordthatshouldwrapinsteadofoverflowing and then a lot more text to make the message span several lines of the card.',
        },
    },
};
