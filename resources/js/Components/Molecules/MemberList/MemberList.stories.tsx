import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ProjectMember } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import MemberList from './MemberList';

const members: ProjectMember[] = [
    {
        id: 1,
        name: 'Jane Cooper',
        email: 'jane@orbit.dev',
        avatar: null,
        role: 'owner',
        joinedAt: '2026-05-02T09:00:00Z',
        roleIds: [],
    },
    {
        id: 2,
        name: 'Marcus Lee',
        email: 'marcus@orbit.dev',
        avatar: null,
        role: 'admin',
        joinedAt: '2026-06-14T09:00:00Z',
        roleIds: [10],
    },
    {
        id: 3,
        name: 'Priya Patel',
        email: 'priya@orbit.dev',
        avatar: null,
        role: 'member',
        joinedAt: '2026-08-01T09:00:00Z',
        roleIds: [],
    },
    {
        id: 4,
        name: 'Tom Becker',
        email: 'tom@orbit.dev',
        avatar: null,
        role: 'viewer',
        joinedAt: '2026-09-20T09:00:00Z',
        roleIds: [],
    },
];

const assignableRoles: WorkspaceRole[] = [
    {
        id: 10,
        name: 'Triage',
        slug: 'triage',
        type: 'custom',
        isSystem: false,
        memberCount: 1,
        permissionIds: [1],
    },
];

const meta = {
    title: 'Molecules/MemberList',
    component: MemberList,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="w-[720px] rounded-xl border border-[var(--border-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        members,
        canUpdateRoles: true,
        canRemoveMembers: true,
        canAssignRoles: true,
        assignableRoles,
        onChangeRole: fn(),
        onToggleCustomRole: fn(),
        onRemove: fn(),
    },
} satisfies Meta<typeof MemberList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Managers can change roles and remove everyone except the owner. */
export const AsManager: Story = {
    play: async ({ canvasElement, args }) => {
        const remove = within(canvasElement).getAllByTitle(
            'Remove from project',
        );
        await expect(remove).toHaveLength(3);
        await userEvent.click(remove[0]);
        await expect(args.onRemove).toHaveBeenCalledWith(2);
    },
};

/** Plain members only see role badges when no custom roles exist. */
export const AsMember: Story = {
    args: {
        canUpdateRoles: false,
        canRemoveMembers: false,
        canAssignRoles: false,
        assignableRoles: [],
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByTitle('Remove from project'),
        ).toBeNull();
    },
};

export const OnlyOwner: Story = {
    args: { members: members.slice(0, 1) },
};
