import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import WeekSummaryCard from './WeekSummaryCard';

const trend = [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 6 },
    { day: 'Wed', count: 9 },
    { day: 'Thu', count: 4 },
    { day: 'Fri', count: 15 },
    { day: 'Sat', count: 1 },
    { day: 'Sun', count: 0 },
];

const meta = {
    title: 'Molecules/WeekSummaryCard',
    component: WeekSummaryCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[190px] w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: { trend, todayName: 'Thu' },
} satisfies Meta<typeof WeekSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Numbers: Story = {
    play: async ({ canvasElement }) => {
        await waitFor(() =>
            expect(within(canvasElement).getByText('Total')).toBeVisible(),
        );
    },
};

export const Sparkline: Story = {
    args: { variant: 'sparkline', color: 'success' },
};

export const Bars: Story = { args: { variant: 'bars', color: 'info' } };

export const QuietWeek: Story = {
    args: { trend: trend.map((day) => ({ ...day, count: 0 })) },
};
