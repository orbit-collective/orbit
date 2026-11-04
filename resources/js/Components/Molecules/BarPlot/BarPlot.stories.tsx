import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import BarPlot from './BarPlot';

const meta = {
    title: 'Molecules/BarPlot',
    component: BarPlot,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px] rounded-2xl bg-[var(--surface-color)] p-5">
                <Story />
            </div>
        ),
    ],
    args: {
        ariaLabel: 'Monthly totals',
        ticks: [0, 25, 50, 75, 100].map((percent) => ({
            percent,
            label: `${percent}%`,
        })),
        bars: [30, 45, 38, 80, 52, 40, 62, 74, 55, 36].map((value, i) => ({
            key: String(i),
            label: [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
            ][i],
            heightPercent: value,
            tooltip: `${value}%`,
        })),
        highlightKey: '3',
        marker: { percent: 80, label: 'Max 80%' },
    },
} satisfies Meta<typeof BarPlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Max 80%')).toBeVisible();
    },
};

export const FewBars: Story = {
    args: {
        bars: [
            { key: 'a', label: 'To do', heightPercent: 25, caption: '25%' },
            { key: 'b', label: 'In progress', heightPercent: 1, caption: '1%' },
            { key: 'c', label: 'Done', heightPercent: 74, caption: '74%' },
        ],
        highlightKey: 'c',
        marker: { percent: 74, label: '74%' },
    },
};

export const Empty: Story = {
    args: {
        bars: [
            { key: 'a', label: 'To do', heightPercent: 0 },
            { key: 'b', label: 'Done', heightPercent: 0 },
        ],
        highlightKey: undefined,
        marker: undefined,
    },
};
