import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { buildCi, buildPullRequest } from '@/tests/development';
import PullRequestRow from './PullRequestRow';

const meta = {
    title: 'Molecules/PullRequestRow',
    component: PullRequestRow,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px]">
                <Story />
            </div>
        ),
    ],
    args: {
        projectId: 1,
        pullRequest: buildPullRequest({
            issues: [{ id: 12, number: 12, title: 'Fix the login redirect' }],
        }),
        expanded: false,
        onToggle: () => {},
        children: (
            <p className="m-0 text-xs text-(--text-gray-color)">
                The detail of the pull request.
            </p>
        ),
    },
} satisfies Meta<typeof PullRequestRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Checks passed')).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: /Add login redirect/ }),
        ).toHaveAttribute('aria-expanded', 'false');
        await userEvent.tab();
    },
};

export const Expanded: Story = {
    args: { expanded: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('The detail of the pull request.'),
        ).toBeVisible();
    },
};

export const ChecksFailed: Story = {
    args: {
        pullRequest: buildPullRequest({
            ci: buildCi({ state: 'failed', passed: 1, failed: 1 }),
            draft: true,
        }),
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Checks failed'),
        ).toBeVisible();
    },
};

export const Merged: Story = {
    args: { pullRequest: buildPullRequest({ state: 'merged', ci: null }) },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Merged')).toBeVisible();
    },
};
