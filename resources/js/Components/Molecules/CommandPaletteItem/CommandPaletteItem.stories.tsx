import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import CommandPaletteItem from './CommandPaletteItem';

const meta = {
    title: 'Molecules/CommandPaletteItem',
    component: CommandPaletteItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-2">
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'item-1',
        active: false,
        onSelect: fn(),
        onHover: fn(),
        command: {
            id: 'project.create',
            title: 'Create project',
            group: 'creation',
            icon: 'FolderPlus',
        },
    },
} satisfies Meta<typeof CommandPaletteItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('option'));
        await expect(args.onSelect).toHaveBeenCalledTimes(1);
    },
};

export const Active: Story = { args: { active: true } };

export const WithShortcut: Story = {
    args: {
        command: {
            id: 'issue.create',
            title: 'Create issue',
            group: 'creation',
            icon: 'Plus',
            shortcut: 'mod+i',
        },
    },
};

/** Matched characters of the query are highlighted. */
export const Highlighted: Story = {
    args: {
        ranges: [[0, 6]],
        command: {
            id: 'issue.open',
            title: 'Create issue',
            group: 'issues',
            icon: 'Plus',
        },
    },
};

/** An issue result: prefix number, colored icon and a subtitle. */
export const IssueResult: Story = {
    args: {
        command: {
            id: 'issue.101',
            title: 'Fix login redirect after session timeout',
            subtitle: 'Orbit',
            prefix: '#12',
            group: 'issues',
            icon: 'Bug',
            iconColor: '#f87171',
        },
    },
};

/** A command with children opens a nested step, hinted by the chevron. */
export const WithChildren: Story = {
    args: {
        command: {
            id: 'issue.status',
            title: 'Change status',
            group: 'issues',
            icon: 'CircleDot',
            children: () => [],
        },
    },
};
