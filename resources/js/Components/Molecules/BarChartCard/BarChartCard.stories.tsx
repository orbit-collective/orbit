import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import TrendBadge from '@/Components/Atoms/TrendBadge/TrendBadge';
import BarChartCard from './BarChartCard';

const hours = (value: number) => `${Math.round(value)}h`;

const meta = {
    title: 'Molecules/BarChartCard',
    component: BarChartCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Container uptime',
        icon: 'ChartColumn',
        formatValue: hours,
        items: [
            { key: 'app', label: 'app', value: 52 },
            { key: 'queue', label: 'queue', value: 51 },
            { key: 'vite', label: 'vite', value: 51 },
            { key: 'reverb', label: 'reverb', value: 140 },
            { key: 'redis', label: 'redis', value: 300 },
            { key: 'backup', label: 'backup', value: 12 },
        ],
    },
} satisfies Meta<typeof BarChartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('redis')).toBeVisible();
    },
};

export const WithSummary: Story = {
    args: {
        summary: (
            <>
                <span>
                    Running: <strong className="text-(--text-color)">9</strong>
                </span>
                <TrendBadge value={2.46} />
            </>
        ),
    },
};

export const Empty: Story = {
    args: { items: [], emptyText: 'No containers found.' },
};
