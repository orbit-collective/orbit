import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeIssueRow } from '@/tests/dashboardIssues';
import DeadlinesCard from './DeadlinesCard';

const NOW = new Date(2026, 10, 10, 12, 0);

const issues = [
    makeIssueRow(1, {
        title: 'Ship the invoices export',
        endDate: '2026-11-05',
    }),
    makeIssueRow(2, {
        title: 'Fix the failing nightly job',
        endDate: '2026-11-09',
    }),
    makeIssueRow(3, {
        title: 'Review the access policy',
        endDate: '2026-11-10',
    }),
    makeIssueRow(4, { title: 'Prepare the demo', endDate: '2026-11-10' }),
    makeIssueRow(5, {
        title: 'Migrate the old reports',
        endDate: '2026-11-12',
    }),
    makeIssueRow(6, { title: 'Write the changelog', endDate: '2026-11-12' }),
    makeIssueRow(7, { title: 'Plan the next quarter', endDate: '2026-11-13' }),
    makeIssueRow(8, {
        title: 'Update the dependency list',
        endDate: '2026-11-18',
    }),
];

const meta = {
    title: 'Organisms/DeadlinesCard',
    component: DeadlinesCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[420px] w-[560px]">
                <Story />
            </div>
        ),
    ],
    args: {
        issues,
        scope: 'all',
        range: 14,
        overdue: true,
        limit: 10,
        now: NOW,
    },
} satisfies Meta<typeof DeadlinesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('list', {
                name: 'Upcoming deadlines',
            }),
        ).toBeInTheDocument();
    },
};

export const Timeline: Story = { args: { variant: 'timeline' } };

export const Week: Story = {
    args: { variant: 'week' },
    decorators: [
        (Story) => (
            <div className="flex h-[300px] w-[760px]">
                <Story />
            </div>
        ),
    ],
};

export const WeekOnAPhone: Story = {
    args: { variant: 'week' },
    decorators: [
        (Story) => (
            <div className="flex h-[300px] w-[340px]">
                <Story />
            </div>
        ),
    ],
};

export const WithoutOverdue: Story = { args: { overdue: false, range: 7 } };

export const Empty: Story = { args: { issues: [] } };
