import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import PercentBarsCard from './PercentBarsCard';

const meta = {
    title: 'Molecules/PercentBarsCard',
    component: PercentBarsCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[340px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Issues by status',
        icon: 'ChartColumn',
        total: '128',
        totalLabel: 'Total issues',
        trend: { value: 15.78 },
        bars: [
            { key: 'todo', label: 'To do', percent: 32 },
            { key: 'in_progress', label: 'In progress', percent: 45 },
            { key: 'done', label: 'Done', percent: 23 },
        ],
        footnote: '23% of all issues are done.',
    },
} satisfies Meta<typeof PercentBarsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('128')).toBeVisible();
    },
};

export const HighlightDone: Story = { args: { highlightKey: 'done' } };

export const Empty: Story = {
    args: {
        total: '0',
        trend: undefined,
        footnote: undefined,
        bars: [
            { key: 'todo', label: 'To do', percent: 0 },
            { key: 'in_progress', label: 'In progress', percent: 0 },
            { key: 'done', label: 'Done', percent: 0 },
        ],
    },
};
