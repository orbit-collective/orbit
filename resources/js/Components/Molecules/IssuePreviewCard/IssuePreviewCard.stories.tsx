import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { issues, makeIssue, taskStatuses } from '@/stories/fixtures';
import IssuePreviewCard from './IssuePreviewCard';

// The card is position: fixed next to an anchor rect, so the stories pin it
// to a point comfortably inside the canvas.
const anchorRect = new DOMRect(40, 40, 120, 20);

const meta = {
    title: 'Molecules/IssuePreviewCard',
    component: IssuePreviewCard,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        issue: issues[0],
        anchorRect,
    },
} satisfies Meta<typeof IssuePreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(issues[0].title),
        ).toBeVisible();
    },
};

export const Unassigned: Story = {
    args: { issue: issues[1] },
};

export const SingleDay: Story = {
    args: {
        issue: makeIssue({ start_date: '2026-10-05', end_date: '2026-10-05' }),
    },
};

export const ManyLabelsLongTitle: Story = {
    args: {
        issue: makeIssue({
            title: 'A very long issue title that wraps over several lines inside the narrow preview card',
            labels: ['bug', 'design', 'ux', 'feature', 'performance'],
            workflowStatus: taskStatuses[3],
            priority: 'low',
        }),
    },
};
