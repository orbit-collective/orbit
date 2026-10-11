import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import CommandPaletteItem from '@/Components/Molecules/CommandPaletteItem/CommandPaletteItem';
import CommandPaletteGroup from './CommandPaletteGroup';

const meta = {
    title: 'Molecules/CommandPaletteGroup',
    component: CommandPaletteGroup,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-2">
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'group-navigation',
        label: 'Navigation',
        children: (
            <>
                <CommandPaletteItem
                    id="item-1"
                    active
                    onSelect={() => {}}
                    onHover={() => {}}
                    command={{
                        id: 'go.dashboard',
                        title: 'Go to dashboard',
                        group: 'navigation',
                        icon: 'LayoutDashboard',
                        shortcut: 'g d',
                    }}
                />
                <CommandPaletteItem
                    id="item-2"
                    active={false}
                    onSelect={() => {}}
                    onHover={() => {}}
                    command={{
                        id: 'go.projects',
                        title: 'Go to projects',
                        group: 'navigation',
                        icon: 'Folder',
                    }}
                />
            </>
        ),
    },
} satisfies Meta<typeof CommandPaletteGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('group', { name: 'Navigation' }),
        ).toBeVisible();
    },
};
