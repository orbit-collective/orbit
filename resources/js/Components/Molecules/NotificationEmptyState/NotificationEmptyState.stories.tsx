import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import NotificationEmptyState from './NotificationEmptyState';

const meta = {
    title: 'Molecules/NotificationEmptyState',
    component: NotificationEmptyState,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof NotificationEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No notifications to display'),
        ).toBeVisible();
    },
};

/** An active filter that matches nothing. */
export const Filtered: Story = {
    args: { filtered: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(
                'No notifications match these filters',
            ),
        ).toBeVisible();
    },
};
