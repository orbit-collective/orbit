import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductivityTrendCard } from './ProductivityTrendCard';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const toTrend = (counts: number[]) =>
    days.map((day, index) => ({ day, count: counts[index] }));

const meta = {
    title: 'Molecules/ProductivityTrendCard',
    component: ProductivityTrendCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[480px]">
                <Story />
            </div>
        ),
    ],
    args: { trendData: toTrend([3, 7, 5, 9, 12, 2, 0]), className: 'w-full' },
} satisfies Meta<typeof ProductivityTrendCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BusyWeek: Story = {
    args: { trendData: toTrend([42, 87, 65, 120, 98, 30, 14]) },
};

/** No updates this week shows the empty state instead of the chart. */
export const NoActivity: Story = {
    args: { trendData: toTrend([0, 0, 0, 0, 0, 0, 0]) },
};
