import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { issues, priorityFields } from '@/stories/fixtures';
import IssueBoard from './IssueBoard';

const meta = {
    title: 'Organisms/IssueBoard',
    component: IssueBoard,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            // The grouping choice is remembered between visits.
            try {
                localStorage.removeItem('boardGroupBy');
            } catch {
                // Storage can be unavailable; the board then starts on priority.
            }
            return (
                <div className="h-[720px] bg-[var(--bg-color)]">
                    <Story />
                </div>
            );
        },
    ],
    args: { issues },
} satisfies Meta<typeof IssueBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', { name: 'High' }),
        ).toBeVisible();
    },
};

export const GroupedByStatus: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Status' }));
        await expect(canvas.getByText('In Progress')).toBeVisible();
    },
};

export const Empty: Story = { args: { issues: [] } };

export const SingleColumnBusy: Story = {
    args: {
        issues: issues.map((issue) => ({
            ...issue,
            ...priorityFields('high'),
        })),
    },
};
