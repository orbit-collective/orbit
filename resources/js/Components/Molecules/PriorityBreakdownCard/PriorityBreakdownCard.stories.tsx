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
        priorities: [
            {
                name: 'High',
                color: '#f44336',
                icon: 'SignalHigh',
                position: 0,
                count: 4,
            },
            {
                name: 'Medium',
                color: '#ff9800',
                icon: 'SignalMedium',
                position: 1,
                count: 9,
            },
            {
                name: 'Low',
                color: '#4caf50',
                icon: 'SignalLow',
                position: 2,
                count: 5,
            },
        ],
        noPriority: 0,
        total: 18,
    },
} satisfies Meta<typeof PriorityBreakdownCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoIssues: Story = {
    args: { priorities: [], noPriority: 0, total: 0 },
};

export const AllHigh: Story = {
    args: {
        priorities: [
            {
                name: 'High',
                color: '#f44336',
                icon: 'SignalHigh',
                position: 0,
                count: 12,
            },
        ],
        total: 12,
    },
};

/** A project's own scale and issues with none at all appear next to the starter names. */
export const CustomScaleWithUnprioritised: Story = {
    args: {
        priorities: [
            {
                name: 'Blocker',
                color: '#9c27b0',
                icon: 'OctagonAlert',
                position: 0,
                count: 2,
            },
            {
                name: 'Medium',
                color: '#ff9800',
                icon: 'SignalMedium',
                position: 1,
                count: 6,
            },
        ],
        noPriority: 4,
        total: 12,
    },
};
