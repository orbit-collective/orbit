import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { PermissionDefinition } from '@/types/Roles';
import { buildPermissionGroups } from '@/utils/permissionGroups';
import RolePermissionsList from './RolePermissionsList';

const permissions: PermissionDefinition[] = [
    { id: 1, key: 'projects.view', group: 'projects' },
    { id: 2, key: 'projects.update', group: 'projects' },
    { id: 3, key: 'projects.delete', group: 'projects' },
    { id: 4, key: 'issues.view', group: 'issues' },
    { id: 5, key: 'issues.create', group: 'issues' },
    { id: 6, key: 'issues.update', group: 'issues' },
    { id: 7, key: 'comments.create', group: 'comments' },
    { id: 8, key: 'comments.delete', group: 'comments' },
];

const meta = {
    title: 'Molecules/RolePermissionsList',
    component: RolePermissionsList,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[560px]">
                <Story />
            </div>
        ),
    ],
    args: {
        groups: buildPermissionGroups(permissions),
        search: '',
        onSearchChange: fn(),
        enabledIds: [1, 4, 5],
        canEdit: true,
        onToggle: fn(),
        onSetAll: fn(),
    },
} satisfies Meta<typeof RolePermissionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadOnly: Story = { args: { canEdit: false } };

export const NoMatches: Story = {
    args: { groups: [], search: 'zzz' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/No permissions match/),
        ).toBeVisible();
    },
};

/** Search and toggles are owned by the parent; this wires them to local state. */
export const Interactive: Story = {
    render: function Render(args) {
        const [search, setSearch] = useState('');
        const [enabled, setEnabled] = useState(args.enabledIds);
        return (
            <RolePermissionsList
                {...args}
                groups={buildPermissionGroups(
                    permissions.filter((p) => p.key.includes(search)),
                )}
                search={search}
                onSearchChange={setSearch}
                enabledIds={enabled}
                onToggle={(id, on) =>
                    setEnabled((prev) =>
                        on ? [...prev, id] : prev.filter((x) => x !== id),
                    )
                }
                onSetAll={(list, on) =>
                    setEnabled(on ? list.map((p) => p.id) : [])
                }
            />
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(
            canvas.getByPlaceholderText('Search permissions...'),
            'comments',
        );
        await expect(
            canvas.getByPlaceholderText('Search permissions...'),
        ).toHaveValue('comments');
    },
};
