import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeIssueRow } from '@/tests/dashboardIssues';
import DashboardIssueRow from './DashboardIssueRow';

const NOW = new Date(2026, 10, 10, 12, 0);

const meta = {
    title: 'Molecules/DashboardIssueRow',
    component: DashboardIssueRow,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px] rounded-xl bg-(--surface-color) p-3">
                <Story />
            </div>
        ),
    ],
    args: { issue: makeIssueRow(1), now: NOW },
} satisfies Meta<typeof DashboardIssueRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('link')).toHaveAttribute(
            'href',
            '/projects/3/issues/1',
        );
    },
};

export const Compact: Story = { args: { density: 'compact' } };

export const Card: Story = { args: { density: 'card' } };

export const Overdue: Story = {
    args: { issue: makeIssueRow(2, { endDate: '2026-11-04' }) },
};

export const Narrow: Story = { args: { narrow: true } };

export const WithoutDetails: Story = {
    args: { show: { project: false, priority: false, due: false } },
};
