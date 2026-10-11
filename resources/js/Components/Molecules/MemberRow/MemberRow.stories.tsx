import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import RoleBadge from '@/Components/Molecules/RoleBadge/RoleBadge';
import { ProjectMember } from '@/types/ProjectMembers';
import MemberRow from './MemberRow';

const member: ProjectMember = {
    id: 2,
    name: 'Marcus Lee',
    email: 'marcus@orbit.dev',
    avatar: null,
    role: 'member',
    joinedAt: '2026-07-14T09:00:00Z',
    roleIds: [],
};

const meta = {
    title: 'Molecules/MemberRow',
    component: MemberRow,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="w-[640px] rounded-xl border border-[var(--border-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        member,
        children: <RoleBadge role="member" />,
    },
} satisfies Meta<typeof MemberRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Marcus Lee'),
        ).toBeVisible();
    },
};

export const Owner: Story = {
    args: {
        member: { ...member, name: 'Jane Cooper', email: 'jane@orbit.dev' },
        children: <RoleBadge role="owner" />,
    },
};

export const LongNameAndEmail: Story = {
    args: {
        member: {
            ...member,
            name: 'Alexandria Montgomery-Featherstonehaugh',
            email: 'alexandria.montgomery-featherstonehaugh@a-very-long-company-domain.example.com',
        },
    },
    decorators: [
        (Story) => (
            <div className="w-[420px] rounded-xl border border-[var(--border-color)]">
                <Story />
            </div>
        ),
    ],
};
