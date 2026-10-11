import type { Meta, StoryObj } from '@storybook/react-vite';
import { projects } from '@/stories/fixtures';
import SettingsLayout from './SettingsLayout';

const meta = {
    title: 'Organisms/SettingsLayout',
    component: SettingsLayout,
    parameters: {
        layout: 'fullscreen',
        inertia: { url: '/settings/preferences' },
    },
    args: {
        tabId: 'preferences',
        projects,
        children: (
            <p className="text-sm text-[var(--text-color)]">
                Settings content goes here.
            </p>
        ),
    },
} satisfies Meta<typeof SettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WorkspaceTab: Story = {
    args: { tabId: 'labels' },
    parameters: { inertia: { url: '/settings/labels' } },
};

/** Fills the panel instead of capping to a reading width. */
export const FullBleed: Story = {
    args: {
        tabId: 'automation',
        fullBleed: true,
        children: (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-gray-color)]">
                Full-bleed workspace
            </div>
        ),
    },
    parameters: { inertia: { url: '/settings/automation' } },
};

export const NoProjects: Story = { args: { projects: [] } };
