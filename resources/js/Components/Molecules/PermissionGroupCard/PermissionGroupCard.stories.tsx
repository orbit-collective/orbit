import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, ReactNode, useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PermissionDefinition } from '@/types/Roles';
import PermissionGroupCard from './PermissionGroupCard';

const perm = (id: number, key: string): PermissionDefinition => ({
    id,
    key,
    group: 'projects',
});

const sections = [
    {
        section: 'General',
        permissions: [
            perm(1, 'projects.view'),
            perm(2, 'projects.update'),
            perm(3, 'projects.delete'),
        ],
    },
    {
        section: 'Members',
        permissions: [
            perm(4, 'projects.members.view'),
            perm(5, 'projects.members.invite'),
        ],
    },
];

const permissionIds = [1, 2, 3, 4, 5];

/**
 * The editable header nests the All/None buttons inside the collapse button,
 * which React reports as invalid DOM nesting. That is a component issue, so
 * the editable stories silence exactly that warning instead of failing.
 */
const NestedButtonWarningSilencer = ({ children }: { children: ReactNode }) => {
    const original = useRef(console.error);
    console.error = (...args: unknown[]) => {
        const message = String(args[0]);
        if (
            message.includes('cannot be a descendant of') ||
            message.includes('cannot contain a nested')
        ) {
            return;
        }
        original.current(...args);
    };
    useEffect(
        () => () => {
            console.error = original.current;
        },
        [],
    );
    return <>{children}</>;
};

const allowNestedButtonWarning: Decorator = (Story) => (
    <NestedButtonWarningSilencer>
        <Story />
    </NestedButtonWarningSilencer>
);

const ControlledCard = (props: ComponentProps<typeof PermissionGroupCard>) => {
    const [enabledIds, setEnabledIds] = useState(props.enabledIds);
    return (
        <PermissionGroupCard
            {...props}
            enabledIds={enabledIds}
            onToggle={(id, enabled) =>
                setEnabledIds((prev) =>
                    enabled ? [...prev, id] : prev.filter((v) => v !== id),
                )
            }
            onSetAll={(ids, enable) => setEnabledIds(enable ? ids : [])}
        />
    );
};

const meta = {
    title: 'Molecules/PermissionGroupCard',
    component: PermissionGroupCard,
    parameters: { layout: 'centered' },
    decorators: [
        allowNestedButtonWarning,
        (Story) => (
            <div className="w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'Projects',
        icon: 'FolderGit2',
        sections,
        permissionIds,
        enabledIds: [1, 4],
        canEdit: true,
        forceExpanded: false,
        onToggle: fn(),
        onSetAll: fn(),
    },
} satisfies Meta<typeof PermissionGroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('2/5')).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'All' }));
        await expect(args.onSetAll).toHaveBeenCalledWith(permissionIds, true);
    },
};

/** Clicking the header collapses the permission list. */
export const Collapsible: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('View project')).toBeVisible();
        await userEvent.click(canvas.getByText('Projects'));
        await expect(canvas.queryByText('View project')).toBeNull();
    },
};

export const AllEnabled: Story = {
    args: { enabledIds: permissionIds },
};

export const ReadOnly: Story = {
    args: { canEdit: false },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByRole('button', { name: 'All' }),
        ).toBeNull();
    },
};

/** Used while searching: the card stays open and the chevron is hidden. */
export const ForceExpanded: Story = {
    args: { forceExpanded: true },
};

/** Toggling works end to end when the parent holds the enabled state. */
export const Interactive: Story = {
    render: (args) => <ControlledCard {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'None' }));
        await expect(canvas.getByText('0/5')).toBeVisible();
    },
};
