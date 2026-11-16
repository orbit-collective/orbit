import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildBranch } from '@/tests/development';
import BranchItem from './BranchItem';

const meta = {
    title: 'Molecules/BranchItem',
    component: BranchItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ul className="m-0 w-[380px] list-none p-0">
                <Story />
            </ul>
        ),
    ],
    args: { branch: buildBranch() },
} satisfies Meta<typeof BranchItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultBranch: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Default')).toBeVisible();
    },
};

export const FeatureBranch: Story = {
    args: {
        branch: buildBranch({
            name: 'feat/login-redirect',
            isDefault: false,
            protected: false,
        }),
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('feat/login-redirect'),
        ).toBeVisible();
    },
};
