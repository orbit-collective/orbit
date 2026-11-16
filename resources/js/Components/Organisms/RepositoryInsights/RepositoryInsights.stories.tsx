import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildInsights } from '@/tests/development';
import RepositoryInsights from './RepositoryInsights';

const meta = {
    title: 'Organisms/RepositoryInsights',
    component: RepositoryInsights,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex w-[420px] flex-col gap-4">
                <Story />
            </div>
        ),
    ],
    args: { insights: buildInsights() },
} satisfies Meta<typeof RepositoryInsights>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Top contributors'),
        ).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: { insights: null },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('status')).toBeInTheDocument();
    },
};

export const NotComputedYet: Story = {
    args: {
        insights: buildInsights({
            commitActivity: [],
            contributors: [],
            languages: [],
        }),
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No language data yet.'),
        ).toBeInTheDocument();
    },
};
