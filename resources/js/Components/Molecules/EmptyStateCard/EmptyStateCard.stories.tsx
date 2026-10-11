import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import DashboardEmptyState from './EmptyStateCard';

const meta = {
    title: 'Molecules/EmptyStateCard',
    component: DashboardEmptyState,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px] rounded-xl border border-[var(--border-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        iconName: 'Inbox',
        title: 'No issues yet',
        description: 'Issues assigned to you will show up here.',
    },
} satisfies Meta<typeof DashboardEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No issues yet'),
        ).toBeVisible();
    },
};

/** The action label fades in on hover and links to `actionHref`. */
export const WithLink: Story = {
    args: { actionLabel: 'Browse projects', actionHref: '/projects' },
};

/** `actionCommand` runs a command-palette command instead of navigating. */
export const WithCommand: Story = {
    args: {
        iconName: 'FolderPlus',
        title: 'Create your first project',
        description: 'Projects group the issues your team works on.',
        actionLabel: 'New project',
        actionCommand: 'project.create',
    },
};
