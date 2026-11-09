import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeIssueRow } from '@/tests/dashboardIssues';
import MyIssuesCard from './MyIssuesCard';

const NOW = new Date(2026, 10, 10, 12, 0);
const high = {
    id: 1,
    name: 'High',
    color: '#f44336',
    icon: 'SignalHigh',
    position: 0,
};
const medium = {
    id: 2,
    name: 'Medium',
    color: '#ff9800',
    icon: 'SignalMedium',
    position: 1,
};

const issues = [
    makeIssueRow(1, {
        title: 'Fix login redirect after session timeout',
        priority: high,
        endDate: '2026-11-08',
    }),
    makeIssueRow(2, {
        title: 'Add pagination to the activity feed',
        priority: medium,
        endDate: '2026-11-12',
        type: { name: 'Feature', icon: 'Sparkles', color: '#8b5cf6' },
    }),
    makeIssueRow(3, {
        title: 'Write the release notes',
        priority: null,
        endDate: null,
        projectName: 'Docs',
        projectColor: 'sky',
    }),
    makeIssueRow(4, {
        title: 'Update the onboarding checklist',
        priority: medium,
        endDate: '2026-11-25',
    }),
    makeIssueRow(5, {
        title: 'Investigate slow dashboard queries',
        priority: high,
        endDate: '2026-11-10',
    }),
];

const meta = {
    title: 'Organisms/MyIssuesCard',
    component: MyIssuesCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: { issues, now: NOW, limit: 5 },
} satisfies Meta<typeof MyIssuesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('list', {
                name: 'Open issues assigned to you',
            }),
        ).toBeInTheDocument();
    },
};

export const Compact: Story = { args: { variant: 'compact' } };

export const Cards: Story = {
    args: { variant: 'cards' },
    decorators: [
        (Story) => (
            <div className="flex h-[420px] w-[720px]">
                <Story />
            </div>
        ),
    ],
};

export const ByDueDate: Story = { args: { sort: 'due' } };

export const Narrow: Story = {
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[300px]">
                <Story />
            </div>
        ),
    ],
};

export const Plain: Story = {
    args: { show: { type: false, project: false, priority: false } },
};

export const Empty: Story = { args: { issues: [] } };
