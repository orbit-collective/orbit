import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { WorkspaceRole } from '@/types/Roles';
import InviteByEmailPanel from './InviteByEmailPanel';

const assignableRoles: WorkspaceRole[] = [
    {
        id: 10,
        name: 'Triage',
        slug: 'triage',
        type: 'custom',
        isSystem: false,
        memberCount: 3,
        permissionIds: [1, 2],
    },
    {
        id: 11,
        name: 'Release manager',
        slug: 'release-manager',
        type: 'custom',
        isSystem: false,
        memberCount: 1,
        permissionIds: [1, 3],
    },
];

const meta = {
    title: 'Molecules/InviteByEmailPanel',
    component: InviteByEmailPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px]">
                <Story />
            </div>
        ),
    ],
    args: {
        emailEnabled: true,
        isManager: true,
        canAssignRoles: true,
        assignableRoles,
        email: '',
        role: 'member',
        roleIds: [],
        error: null,
        isInviting: false,
        onEmailChange: () => {},
        onRoleChange: () => {},
        onToggleRoleId: () => {},
        onSubmit: (event) => event.preventDefault(),
    },
    render: function Render(args) {
        const [email, setEmail] = useState(args.email);
        const [role, setRole] = useState(args.role);
        const [roleIds, setRoleIds] = useState(args.roleIds);

        return (
            <InviteByEmailPanel
                {...args}
                email={email}
                role={role}
                roleIds={roleIds}
                onEmailChange={setEmail}
                onRoleChange={setRole}
                onToggleRoleId={(id, enabled) =>
                    setRoleIds((ids) =>
                        enabled ? [...ids, id] : ids.filter((i) => i !== id),
                    )
                }
            />
        );
    },
} satisfies Meta<typeof InviteByEmailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Invite' }),
        ).toBeEnabled();
    },
};

export const WithError: Story = {
    args: {
        email: 'jane@orbit',
        error: 'That email address is not valid.',
    },
};

export const Inviting: Story = {
    args: { email: 'jane@orbit.dev', isInviting: true },
};

export const NotAManager: Story = {
    args: { isManager: false },
};

/** Without outgoing email configured, invitations are switched off. */
export const EmailDisabled: Story = {
    args: { emailEnabled: false },
};
