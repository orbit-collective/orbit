import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { WorkspaceRole } from '@/types/Roles';
import { ROLE_TYPE_THEME } from '@/utils/roleTheme';
import RoleListItem from './RoleListItem';

const role: WorkspaceRole = {
    id: 3,
    name: 'Member',
    slug: 'member',
    type: 'member',
    isSystem: true,
    memberCount: 5,
    permissionIds: [1, 2, 3, 4, 5, 6],
};

const meta = {
    title: 'Molecules/RoleListItem',
    component: RoleListItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[280px]">
                <Story />
            </div>
        ),
    ],
    args: {
        role,
        theme: ROLE_TYPE_THEME.member,
        totalPermissions: 12,
        selected: false,
        onClick: fn(),
    },
} satisfies Meta<typeof RoleListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('50')).toBeVisible();
        await userEvent.click(canvas.getByRole('button'));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};

export const Selected: Story = { args: { selected: true } };

export const OwnerFullAccess: Story = {
    args: {
        role: {
            ...role,
            name: 'Owner',
            type: 'owner',
            memberCount: 1,
            permissionIds: Array.from({ length: 12 }, (_, i) => i + 1),
        },
        theme: ROLE_TYPE_THEME.owner,
    },
};

export const CustomRoleNoPermissions: Story = {
    args: {
        role: {
            ...role,
            name: 'A custom role with a very long name that truncates',
            type: 'custom',
            isSystem: false,
            memberCount: 1,
            permissionIds: [],
        },
        theme: ROLE_TYPE_THEME.custom,
    },
};
