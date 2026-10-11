import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { WorkspaceRole } from '@/types/Roles';
import RoleDetailHeader from './RoleDetailHeader';

const customRole: WorkspaceRole = {
    id: 5,
    name: 'QA Engineer',
    slug: 'qa-engineer',
    type: 'custom',
    isSystem: false,
    memberCount: 3,
    permissionIds: [1, 2, 3, 4],
};

const meta = {
    title: 'Molecules/RoleDetailHeader',
    component: RoleDetailHeader,
    parameters: { layout: 'padded' },
    args: {
        role: customRole,
        ratio: 40,
        renameDraft: null,
        isSavingRename: false,
        canUpdateRoles: true,
        canDeleteRoles: true,
        onRenameDraftChange: fn(),
        onStartRename: fn(),
        onSaveRename: fn(),
        onCancelRename: fn(),
        onDeleteRequest: fn(),
    },
} satisfies Meta<typeof RoleDetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CustomRole: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTitle('Rename role'));
        await expect(args.onStartRename).toHaveBeenCalledTimes(1);
        await userEvent.click(canvas.getByTitle('Delete role'));
        await expect(args.onDeleteRequest).toHaveBeenCalledTimes(1);
    },
};

/** The owner role is read-only and always has every permission. */
export const OwnerRole: Story = {
    args: {
        role: {
            ...customRole,
            id: 1,
            name: 'Owner',
            slug: 'owner',
            type: 'owner',
            isSystem: true,
            memberCount: 1,
        },
        ratio: 100,
    },
};

/** System roles can be renamed but not deleted. */
export const SystemRole: Story = {
    args: {
        role: {
            ...customRole,
            id: 3,
            name: 'Member',
            slug: 'member',
            type: 'member',
            isSystem: true,
        },
        ratio: 60,
    },
};

export const ReadOnly: Story = {
    args: { canUpdateRoles: false, canDeleteRoles: false },
};

export const Renaming: Story = {
    args: { renameDraft: { name: 'QA Engineer', slug: 'qa-engineer' } },
};

export const RenamingSaving: Story = {
    args: {
        renameDraft: { name: 'QA Engineer', slug: 'qa-engineer' },
        isSavingRename: true,
    },
};

/** Editing the draft in place, as the roles page does. */
export const RenameInteractive: Story = {
    render: function Render(args) {
        const [draft, setDraft] = useState<{
            name: string;
            slug: string;
        } | null>(null);
        return (
            <RoleDetailHeader
                {...args}
                renameDraft={draft}
                onStartRename={() =>
                    setDraft({ name: args.role.name, slug: args.role.slug })
                }
                onCancelRename={() => setDraft(null)}
                onRenameDraftChange={setDraft}
            />
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTitle('Rename role'));
        await expect(canvas.getByPlaceholderText('Role name')).toHaveValue(
            'QA Engineer',
        );
    },
};
