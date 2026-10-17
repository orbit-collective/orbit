import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeIssueStats } from '@/tests/issueStats';
import DashboardVisuals from './DashboardVisuals';

const meta = {
    title: 'Organisms/DashboardVisuals',
    component: DashboardVisuals,
    decorators: [
        (Story) => (
            <div className="bg-[var(--bg-color)] p-6">
                <Story />
            </div>
        ),
    ],
    args: {
        stats: makeIssueStats({
            high: 4,
            medium: 6,
            low: 2,
            todo: 5,
            inProgress: 4,
            done: 3,
        }),
        productivity_trend: [
            { day: 'Mon', count: 3 },
            { day: 'Tue', count: 5 },
            { day: 'Wed', count: 2 },
            { day: 'Thu', count: 8 },
            { day: 'Fri', count: 6 },
            { day: 'Sat', count: 1 },
            { day: 'Sun', count: 0 },
        ],
    },
} satisfies Meta<typeof DashboardVisuals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Completion Ratio')).toBeVisible();
        await expect(canvas.getByText('Priority Breakdown')).toBeVisible();
        await expect(canvas.getByText('Productivity Trend')).toBeVisible();
    },
};

/** A new workspace: no issues and a flat trend. */
export const Empty: Story = {
    args: {
        stats: makeIssueStats(),
        productivity_trend: [
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun',
        ].map((day) => ({ day, count: 0 })),
    },
};

export const AllClosed: Story = {
    args: {
        stats: makeIssueStats({ high: 4, medium: 6, low: 2, done: 12 }),
    },
};

export const BusyWeek: Story = {
    args: {
        productivity_trend: [
            { day: 'Mon', count: 120 },
            { day: 'Tue', count: 240 },
            { day: 'Wed', count: 180 },
            { day: 'Thu', count: 310 },
            { day: 'Fri', count: 95 },
            { day: 'Sat', count: 20 },
            { day: 'Sun', count: 12 },
        ],
    },
};
