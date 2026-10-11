import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import StatCard from './StatCard';

const meta = {
    title: 'Molecules/StatCard',
    component: StatCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[300px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Open issues',
        value: 42,
        icon: 'CircleDot',
        description: 'Issues that are not closed yet.',
    },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('42')).toBeVisible();
    },
};

export const PositiveTrend: Story = {
    args: {
        trend: { value: 12, label: 'vs. last week', isPositive: true },
    },
};

export const NegativeTrend: Story = {
    args: {
        title: 'Closed issues',
        icon: 'CircleCheck',
        color: 'error',
        trend: { value: -8, label: 'vs. last week', isPositive: false },
    },
};

export const WithProgress: Story = {
    args: { progress: 68, color: 'success' },
};

export const Accent: Story = {
    args: { variant: 'accent', progress: 40 },
};

export const Glass: Story = {
    args: { variant: 'glass', color: 'info' },
};

/** The compact horizontal card used in dashboard rows. */
export const Vivid: Story = {
    args: { variant: 'vivid', progress: 75, color: 'warning' },
};

export const VividWithTrend: Story = {
    args: {
        variant: 'vivid',
        color: 'success',
        trend: { value: 5, label: 'this month', isPositive: true },
    },
};
