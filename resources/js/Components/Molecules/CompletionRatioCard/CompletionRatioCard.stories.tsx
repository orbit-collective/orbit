import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CompletionRatioCard } from './CompletionRatioCard';

const meta = {
    title: 'Molecules/CompletionRatioCard',
    component: CompletionRatioCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: {
        open: 8,
        inProgress: 5,
        closed: 12,
        total: 25,
        closedPct: 48,
    },
} satisfies Meta<typeof CompletionRatioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTrack: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('On track')).toBeVisible();
    },
};

export const Excellent: Story = {
    args: { open: 1, inProgress: 1, closed: 18, total: 20, closedPct: 90 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Excellent'),
        ).toBeVisible();
    },
};

export const NeedsAttention: Story = {
    args: { open: 14, inProgress: 4, closed: 2, total: 20, closedPct: 10 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Needs attention'),
        ).toBeVisible();
    },
};

/** With no issues the tier badge is hidden. */
export const Empty: Story = {
    args: { open: 0, inProgress: 0, closed: 0, total: 0, closedPct: 0 },
};
