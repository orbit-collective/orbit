import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildCi } from '@/tests/development';
import CiRunList from './CiRunList';

const meta = {
    title: 'Molecules/CiRunList',
    component: CiRunList,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: { runs: buildCi().runs },
} satisfies Meta<typeof CiRunList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Passed: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('build')).toBeVisible();
    },
};

export const Mixed: Story = {
    args: {
        runs: [
            {
                name: 'build',
                state: 'passed',
                url: 'https://github.com',
                durationSeconds: 95,
            },
            {
                name: 'phpunit',
                state: 'failed',
                url: 'https://github.com',
                durationSeconds: 210,
            },
            {
                name: 'deploy preview',
                state: 'pending',
                url: null,
                durationSeconds: null,
            },
        ],
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('phpunit')).toBeVisible();
    },
};

export const NoChecks: Story = {
    args: { runs: [] },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('This commit has no checks.'),
        ).toBeVisible();
    },
};
