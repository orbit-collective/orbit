import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PendingProjectInvitation } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import PendingInvitationsPanel from './PendingInvitationsPanel';

const assignableRoles: WorkspaceRole[] = [
    {
        id: 10,
        name: 'QA lead',
        slug: 'qa-lead',
        type: 'custom',
        isSystem: false,
        memberCount: 2,
        permissionIds: [],
    } as WorkspaceRole,
];

const inDays = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const invitations: PendingProjectInvitation[] = [
    {
        id: 1,
        email: 'new.hire@example.com',
        role: 'member',
        roleIds: [],
        invitedByName: 'Jane Cooper',
        expiresAt: inDays(5),
    },
    {
        id: 2,
        email: 'contractor@example.com',
        role: 'viewer',
        roleIds: [10, 99],
        invitedByName: null,
        expiresAt: inDays(1),
    },
];

const meta = {
    title: 'Molecules/PendingInvitationsPanel',
    component: PendingInvitationsPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[720px]">
                <Story />
            </div>
        ),
    ],
    args: { invitations, assignableRoles, onRevoke: fn() },
} satisfies Meta<typeof PendingInvitationsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('new.hire@example.com')).toBeVisible();
        await userEvent.click(
            canvas.getAllByRole('button', { name: 'Revoke' })[0],
        );
        await expect(args.onRevoke).toHaveBeenCalledWith(1);
    },
};

export const Empty: Story = {
    args: { invitations: [] },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No pending invitations'),
        ).toBeVisible();
    },
};
