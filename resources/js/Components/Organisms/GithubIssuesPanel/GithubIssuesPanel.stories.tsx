import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { buildGithubIssue } from '@/tests/development';
import GithubIssuesPanel from './GithubIssuesPanel';

const meta = {
    title: 'Organisms/GithubIssuesPanel',
    component: GithubIssuesPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[720px]">
                <Story />
            </div>
        ),
    ],
    args: {
        repositoryUrl: 'https://github.com/orbit-collective/orbit',
        issues: [
            buildGithubIssue(),
            buildGithubIssue({
                id: 2,
                number: 14,
                title: 'Board columns jump on drag',
                labels: [{ name: 'ui', color: '1d76db' }],
                commentCount: 0,
            }),
            buildGithubIssue({
                id: 3,
                number: 15,
                title: 'Add dark mode to the calendar',
                labels: [],
            }),
        ],
        state: 'open',
        onStateChange: () => {},
        hasMore: true,
        rangeLabel: 'Updated in the last 90 days',
        perPage: 5,
        perPageOptions: [5, 10, 25],
        onPerPageChange: () => {},
        error: null,
        onRetry: () => {},
        onCreateBranch: async () => true,
        busy: false,
    },
} satisfies Meta<typeof GithubIssuesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', {
                name: 'Create branch 12-fix-the-login-redirect',
            }),
        );
        await expect(
            await canvas.findByRole('button', {
                name: 'Branch 12-fix-the-login-redirect created',
            }),
        ).toBeInTheDocument();
    },
};

export const ReadOnly: Story = {
    args: { onCreateBranch: undefined },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByRole('button', {
                name: /Create branch/,
            }),
        ).toBeNull();
    },
};

export const Loading: Story = {
    args: { issues: null },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('status'),
        ).toBeInTheDocument();
    },
};
