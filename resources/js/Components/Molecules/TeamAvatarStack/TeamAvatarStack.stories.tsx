import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { users } from '@/stories/fixtures';
import type { ProjectMember } from '@/types/ProjectMembers';
import TeamAvatarStack from './TeamAvatarStack';

const makeMembers = (count: number): ProjectMember[] =>
    Array.from({ length: count }, (_, index) => {
        const user = users[index % users.length];
        return {
            id: index + 1,
            name: user.name,
            email: `user${index + 1}@example.com`,
            avatar: null,
            role: index === 0 ? 'owner' : 'member',
            joinedAt: '2026-01-01T00:00:00Z',
            roleIds: [],
        };
    });

const meta = {
    title: 'Molecules/TeamAvatarStack',
    component: TeamAvatarStack,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)]">
                <Story />
            </div>
        ),
    ],
    args: { members: makeMembers(4) },
} satisfies Meta<typeof TeamAvatarStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/4 people have access/),
        ).toBeVisible();
    },
};

export const SingleMember: Story = {
    args: { members: makeMembers(1) },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/1 person has access/),
        ).toBeVisible();
    },
};

/** Only eight avatars show; the rest collapse into a "+N" bubble. */
export const Overflow: Story = {
    args: { members: makeMembers(12) },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('+4')).toBeVisible();
    },
};
