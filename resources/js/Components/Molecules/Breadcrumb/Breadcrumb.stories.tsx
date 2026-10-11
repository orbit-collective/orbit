import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Breadcrumb from './Breadcrumb';

const meta = {
    title: 'Molecules/Breadcrumb',
    component: Breadcrumb,
    parameters: { layout: 'centered' },
    args: {
        items: [
            { label: 'Projects', href: '/projects', icon: 'Folder' },
            { label: 'Orbit', href: '/projects/1' },
            { label: 'Fix login redirect' },
        ],
    },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Earlier items link back; the last one is the current page and is not a link. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getAllByRole('link')).toHaveLength(2);
        await expect(canvas.getByText('Fix login redirect')).toBeVisible();
    },
};

export const SingleItem: Story = {
    args: { items: [{ label: 'Dashboard', icon: 'LayoutDashboard' }] },
};

export const Deep: Story = {
    args: {
        items: [
            { label: 'Settings', href: '/settings', icon: 'Settings' },
            { label: 'Workspace', href: '/settings/workspace' },
            { label: 'Automation', href: '/settings/workspace/automation' },
            { label: 'Rule: close stale issues' },
        ],
    },
};
