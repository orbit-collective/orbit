import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { projects } from '@/stories/fixtures';
import ProjectsDirectoryPanel from './ProjectsDirectoryPanel';

const withCounts = projects.map((project) => ({
    ...project,
    issue_counts: { todo: 4, in_progress: 3, done: 5 },
}));

const meta = {
    title: 'Molecules/ProjectsDirectoryPanel',
    component: ProjectsDirectoryPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex w-[380px]">
                <Story />
            </div>
        ),
    ],
    args: { projects: withCounts },
} satisfies Meta<typeof ProjectsDirectoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three project cards and a link to the rest. */
export const Cards: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('View all 5 projects'),
        ).toBeVisible();
    },
};

export const Compact: Story = {
    args: { variant: 'compact', limit: 5 },
};

export const Empty: Story = {
    args: { projects: [] },
};
