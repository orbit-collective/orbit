import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { projects } from '@/stories/fixtures';
import Sidebar from './Sidebar';

const meta = {
    title: 'Organisms/Sidebar',
    component: Sidebar,
    parameters: { layout: 'fullscreen', inertia: { url: '/' } },
    args: { projects },
    decorators: [
        (Story) => (
            <div className="flex h-screen bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText('Mobile App'),
        ).toBeVisible();
    },
};

export const NoProjects: Story = { args: { projects: [] } };

export const SettingsPage: Story = {
    parameters: { inertia: { url: '/settings/labels' } },
};

export const ManyProjects: Story = {
    args: {
        projects: Array.from({ length: 24 }, (_, index) => ({
            ...projects[index % projects.length],
            id: index + 1,
            name: `Project ${index + 1}`,
            slug: `project-${index + 1}`,
        })),
    },
};

/** The collapse toggle shrinks the sidebar to icons. */
export const Collapsible: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByLabelText('Collapse sidebar'));
        const expand = canvas.getByLabelText('Expand sidebar');
        await expect(expand).toBeInTheDocument();
        // The choice is persisted, so restore it for the stories that follow.
        await userEvent.click(expand);
    },
};

export const Mobile: Story = {
    globals: { viewport: { value: 'mobile1' } },
};
