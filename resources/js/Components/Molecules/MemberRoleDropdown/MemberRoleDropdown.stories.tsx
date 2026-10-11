import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { WorkspaceRole } from '@/types/Roles';
import MemberRoleDropdown from './MemberRoleDropdown';

const customRoles: WorkspaceRole[] = [
    {
        id: 10,
        name: 'Triage',
        slug: 'triage',
        type: 'custom',
        isSystem: false,
        memberCount: 3,
        permissionIds: [1],
    },
    {
        id: 11,
        name: 'Release manager',
        slug: 'release-manager',
        type: 'custom',
        isSystem: false,
        memberCount: 1,
        permissionIds: [2],
    },
];

const meta = {
    title: 'Molecules/MemberRoleDropdown',
    component: MemberRoleDropdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="h-[340px]">
                <Story />
            </div>
        ),
    ],
    args: {
        role: 'member',
        canChangeRole: true,
        onChangeRole: () => {},
        customRoles,
        selectedCustomRoleIds: [10],
        canAssignCustomRoles: true,
        onToggleCustomRole: () => {},
    },
    render: function Render(args) {
        const [role, setRole] = useState(args.role);
        const [ids, setIds] = useState(args.selectedCustomRoleIds);

        return (
            <MemberRoleDropdown
                {...args}
                role={role}
                onChangeRole={setRole}
                selectedCustomRoleIds={ids}
                onToggleCustomRole={(id, enabled) =>
                    setIds((current) =>
                        enabled
                            ? [...current, id]
                            : current.filter((i) => i !== id),
                    )
                }
            />
        );
    },
} satisfies Meta<typeof MemberRoleDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(
            await within(document.body).findByText('Custom roles'),
        ).toBeVisible();
    },
};

export const NoCustomRoles: Story = {
    args: { customRoles: [], selectedCustomRoleIds: [] },
};

/** The owner's base role is fixed, but custom roles can still be toggled. */
export const OwnerCustomRolesOnly: Story = {
    args: { role: 'owner', canChangeRole: false },
};

export const ReadOnly: Story = {
    args: { canChangeRole: false, canAssignCustomRoles: false },
};
