import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import UserPreviewCard from './UserPreviewCard';

const anchorRect = new DOMRect(40, 40, 24, 24);

const meta = {
    title: 'Molecules/UserPreviewCard',
    component: UserPreviewCard,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        anchorRect,
        user: {
            id: 1,
            name: 'Jane Doe',
            email: 'jane@example.com',
            avatar: null,
            recentIssues: [
                {
                    id: 1,
                    number: 12,
                    title: 'Fix login redirect',
                    project_id: 1,
                    workflowStatus: null,
                    updated_at: new Date().toISOString(),
                },
            ],
        },
    },
} satisfies Meta<typeof UserPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Jane Doe')).toBeVisible();
    },
};

export const NoRecentIssues: Story = {
    args: { user: { ...meta.args.user, recentIssues: [] } },
};
