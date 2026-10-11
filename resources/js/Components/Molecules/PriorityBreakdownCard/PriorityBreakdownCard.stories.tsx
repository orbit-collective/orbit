import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriorityBreakdownCard } from './PriorityBreakdownCard';

const meta = {
    title: 'Molecules/PriorityBreakdownCard',
    component: PriorityBreakdownCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        high: 4,
        medium: 9,
        low: 5,
        highPct: 22,
        mediumPct: 50,
        lowPct: 28,
    },
} satisfies Meta<typeof PriorityBreakdownCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoIssues: Story = {
    args: { high: 0, medium: 0, low: 0, highPct: 0, mediumPct: 0, lowPct: 0 },
};

export const AllHigh: Story = {
    args: {
        high: 12,
        medium: 0,
        low: 0,
        highPct: 100,
        mediumPct: 0,
        lowPct: 0,
    },
};
