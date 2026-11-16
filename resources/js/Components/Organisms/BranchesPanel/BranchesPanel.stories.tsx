import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildBranch } from '@/tests/development';
import BranchesPanel from './BranchesPanel';

const branches = [
    buildBranch(),
    ...[
        'develop',
        'feat/login',
        'feat/board',
        'fix/typo',
        'chore/deps',
        'docs/readme',
        'release/1.0',
    ].map((name) =>
        buildBranch({
            name,
            isDefault: false,
            protected: name === 'release/1.0',
        }),
    ),
];

const meta = {
    title: 'Organisms/BranchesPanel',
    component: BranchesPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: { branches, error: null, onRetry: () => {}, onCreate: () => {} },
} satisfies Meta<typeof BranchesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Show 2 more' }),
        ).toBeVisible();
    },
};

export const Loading: Story = {
    args: { branches: null },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('status')).toBeVisible();
    },
};

export const Failed: Story = {
    args: { branches: null, error: 'Could not load branches.' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('alert')).toBeVisible();
    },
};
