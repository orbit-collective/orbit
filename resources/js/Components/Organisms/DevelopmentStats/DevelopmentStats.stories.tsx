import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildInsights, buildPullRequest } from '@/tests/development';
import DevelopmentStats from './DevelopmentStats';

const meta = {
    title: 'Organisms/DevelopmentStats',
    component: DevelopmentStats,
    parameters: { layout: 'padded' },
    args: {
        pullRequests: [
            buildPullRequest({ number: 1 }),
            buildPullRequest({
                number: 2,
                requestedReviewers: [{ login: 'bob', avatarUrl: '' }],
            }),
            buildPullRequest({
                number: 3,
                state: 'merged',
                mergedAt: new Date().toISOString(),
                ci: null,
            }),
        ],
        insights: buildInsights(),
    },
} satisfies Meta<typeof DevelopmentStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Open pull requests'),
        ).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: { pullRequests: null, insights: null },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getAllByTestId('skeleton'),
        ).toHaveLength(5);
    },
};
