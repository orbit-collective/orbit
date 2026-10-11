import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import RoleBadge from './RoleBadge';

const meta = {
    title: 'Molecules/RoleBadge',
    component: RoleBadge,
    parameters: { layout: 'centered' },
    args: { role: 'member' },
} satisfies Meta<typeof RoleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Member: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Member')).toBeVisible();
    },
};

export const Viewer: Story = { args: { role: 'viewer' } };

/** Admins and owners are tinted with the accent color. */
export const Admin: Story = { args: { role: 'admin' } };

export const Owner: Story = { args: { role: 'owner' } };

export const AllRoles: Story = {
    render: () => (
        <div className="flex gap-2">
            {(['owner', 'admin', 'member', 'viewer'] as const).map((role) => (
                <RoleBadge key={role} role={role} />
            ))}
        </div>
    ),
};
