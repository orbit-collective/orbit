import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import DevelopmentEmptyState from './DevelopmentEmptyState';

const meta = {
    title: 'Organisms/DevelopmentEmptyState',
    component: DevelopmentEmptyState,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="flex h-[420px]">
                <Story />
            </div>
        ),
    ],
    args: { kind: 'not_connected', canConfigure: true },
} satisfies Meta<typeof DevelopmentEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('link', { name: 'Connect GitHub' }),
        ).toBeInTheDocument();
    },
};

export const NoRepositories: Story = {
    args: { kind: 'no_repositories' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', {
                name: 'Add a repository',
            }),
        ).toBeInTheDocument();
    },
};

export const MemberWithoutAccess: Story = {
    args: { canConfigure: false },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/Ask a project admin/),
        ).toBeInTheDocument();
    },
};
