import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { issue } from '@/stories/fixtures';
import IssueMentionLink from './IssueMentionLink';

const preview = {
    id: Number(issue.id),
    number: issue.number,
    title: issue.title,
    workflowStatus: issue.workflowStatus,
    priority: issue.priority,
    labels: issue.labels,
    start_date: issue.start_date,
    end_date: issue.end_date,
    assignee: { id: 2, name: 'Marcus Lee', avatar: null },
};

const meta = {
    title: 'Molecules/IssueMentionLink',
    component: IssueMentionLink,
    parameters: {
        layout: 'centered',
        network: [{ url: /issues.*preview/, response: preview }],
    },
    decorators: [
        (Story) => (
            <p className="w-[360px] pt-64 text-sm text-[var(--text-color)]">
                This looks related to <Story /> from last week.
            </p>
        ),
    ],
    args: {
        projectId: 1,
        issueId: Number(issue.id),
        title: issue.title,
        label: `#${issue.number}`,
    },
} satisfies Meta<typeof IssueMentionLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hovering the link loads and shows the issue preview card. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const link = within(canvasElement).getByRole('link', { name: '#12' });
        await userEvent.hover(link);
        await expect(
            await within(document.body).findByText('Marcus Lee'),
        ).toBeVisible();
        await userEvent.unhover(link);
    },
};

/** No project means no link and no preview. */
export const WithoutProject: Story = {
    args: { projectId: undefined },
};
