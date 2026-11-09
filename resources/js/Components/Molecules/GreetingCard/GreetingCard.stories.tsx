import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import GreetingCard from './GreetingCard';

const meta = {
    title: 'Molecules/GreetingCard',
    component: GreetingCard,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="flex h-[130px] w-[720px]">
                <Story />
            </div>
        ),
    ],
    args: {
        name: 'Jane Cooper',
        now: new Date(2026, 10, 10, 9, 15),
        assigned: 7,
        overdue: 2,
        dueSoon: 4,
    },
} satisfies Meta<typeof GreetingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Banner: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading'),
        ).toHaveTextContent('Good morning, Jane');
    },
};

export const Afternoon: Story = {
    args: { now: new Date(2026, 10, 10, 14, 0), color: 'warning' },
};

export const Evening: Story = {
    args: { now: new Date(2026, 10, 10, 19, 30), color: 'info' },
};

export const Night: Story = {
    args: { now: new Date(2026, 10, 10, 23, 40), color: 'accent' },
};

export const Compact: Story = {
    args: { variant: 'compact' },
    decorators: [
        (Story) => (
            <div className="flex h-[80px] w-[720px]">
                <Story />
            </div>
        ),
    ],
};

export const Minimal: Story = {
    args: { variant: 'minimal' },
    decorators: [
        (Story) => (
            <div className="flex h-[64px] w-[720px]">
                <Story />
            </div>
        ),
    ],
};

export const Quiet: Story = {
    args: {
        showName: false,
        showSummary: false,
        assigned: 0,
        overdue: 0,
        dueSoon: 0,
    },
};
