import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { WorkspaceRole } from '@/types/Roles';
import RoleSidebar from './RoleSidebar';

const roles: WorkspaceRole[] = [
    {
        id: 1,
        name: 'Owner',
        slug: 'owner',
        type: 'owner',
        isSystem: true,
        memberCount: 1,
        permissionIds: Array.from({ length: 12 }, (_, i) => i + 1),
    },
    {
        id: 2,
        name: 'Admin',
        slug: 'admin',
        type: 'admin',
        isSystem: true,
        memberCount: 2,
        permissionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    {
        id: 3,
        name: 'Member',
        slug: 'member',
        type: 'member',
        isSystem: true,
        memberCount: 8,
        permissionIds: [1, 4, 5, 6],
    },
    {
        id: 4,
        name: 'Viewer',
        slug: 'viewer',
        type: 'viewer',
        isSystem: true,
        memberCount: 3,
        permissionIds: [1, 4],
    },
    {
        id: 5,
        name: 'QA Engineer',
        slug: 'qa-engineer',
        type: 'custom',
        isSystem: false,
        memberCount: 1,
        permissionIds: [1, 4, 5],
    },
];

const meta = {
    title: 'Molecules/RoleSidebar',
    component: RoleSidebar,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[300px]">
                <Story />
            </div>
        ),
    ],
    args: {
        roles,
        selectedRoleId: 3,
        totalPermissions: 12,
        canCreateRoles: true,
        onSelect: fn(),
        onCreateRequest: fn(),
    },
} satisfies Meta<typeof RoleSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /Admin/ }));
        await expect(args.onSelect).toHaveBeenCalledWith(2);
        await userEvent.click(
            canvas.getByRole('button', { name: 'Create role' }),
        );
        await expect(args.onCreateRequest).toHaveBeenCalledTimes(1);
    },
};

export const CannotCreate: Story = {
    args: { canCreateRoles: false },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByRole('button', {
                name: 'Create role',
            }),
        ).toBeNull();
    },
};

export const Interactive: Story = {
    render: function Render(args) {
        const [selected, setSelected] = useState<number | null>(
            args.selectedRoleId,
        );
        return (
            <RoleSidebar
                {...args}
                selectedRoleId={selected}
                onSelect={setSelected}
            />
        );
    },
};

export const NothingSelected: Story = { args: { selectedRoleId: null } };
