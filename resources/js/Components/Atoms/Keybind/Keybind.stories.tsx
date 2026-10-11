import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Keybind from './Keybind';

const meta = {
    title: 'Atoms/Keybind',
    component: Keybind,
    parameters: { layout: 'centered' },
    args: { keybind: 'C', tooltipText: 'Create issue' },
    argTypes: {
        surface: { control: 'inline-radio', options: ['default', 'solid'] },
        tooltip: { control: 'boolean' },
    },
} satisfies Meta<typeof Keybind>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('C')).toBeInTheDocument();
    },
};

/** `solid` keeps contrast when the chip sits on a hovered or active row. */
export const Solid: Story = {
    args: { surface: 'solid' },
    decorators: [
        (Story) => (
            <div className="rounded-md bg-[var(--bg-light-color)] p-3">
                <Story />
            </div>
        ),
    ],
};

export const WithoutTooltip: Story = { args: { tooltip: false } };

export const Chord: Story = {
    args: { keybind: '⌘K', tooltipText: 'Command palette' },
};
