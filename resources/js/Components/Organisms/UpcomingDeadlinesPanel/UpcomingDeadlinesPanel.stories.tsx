import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeIssue } from '@/stories/fixtures';
import UpcomingDeadlinesPanel from './UpcomingDeadlinesPanel';

const dateKey = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const meta = {
    title: 'Organisms/UpcomingDeadlinesPanel',
    component: UpcomingDeadlinesPanel,
    args: {
        issues: [
            makeIssue({
                id: '101',
                title: 'Fix login redirect',
                end_date: dateKey(-3),
            }),
            makeIssue({
                id: '102',
                title: 'Ship billing page',
                end_date: dateKey(0),
            }),
            makeIssue({
                id: '103',
                title: 'Write release notes',
                end_date: dateKey(1),
            }),
            makeIssue({
                id: '104',
                title: 'Audit accessibility',
                end_date: dateKey(5),
            }),
            makeIssue({
                id: '105',
                title: 'Plan Q4 roadmap',
                end_date: dateKey(30),
            }),
        ],
    },
} satisfies Meta<typeof UpcomingDeadlinesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Due today')).toBeVisible();
        await expect(canvas.getByText('Overdue by 3 days')).toBeVisible();
    },
};

export const Empty: Story = { args: { issues: [] } };

export const LongTitle: Story = {
    args: {
        issues: [
            makeIssue({
                id: '201',
                title: 'An exceptionally long issue title that should be truncated rather than break the panel layout',
                end_date: dateKey(2),
            }),
        ],
    },
};
