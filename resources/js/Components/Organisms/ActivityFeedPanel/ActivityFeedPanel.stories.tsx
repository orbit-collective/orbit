import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { activityEntries, issueTypes, users } from '@/stories/fixtures';
import { makePaginated } from '@/tests/paginated';
import ActivityFeedPanel from './ActivityFeedPanel';

const meta = {
    title: 'Organisms/ActivityFeedPanel',
    component: ActivityFeedPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: {
        activityLogs: makePaginated(activityEntries),
        users,
        issueTypes,
        queryParams: {},
    },
} satisfies Meta<typeof ActivityFeedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Recent Work Activity'),
        ).toBeVisible();
    },
};

export const Empty: Story = {
    args: { activityLogs: makePaginated([]) },
};
