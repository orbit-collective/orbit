import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import CommandPaletteInput from './CommandPaletteInput';

const ControlledInput = (props: ComponentProps<typeof CommandPaletteInput>) => {
    const [value, setValue] = useState('');
    return <CommandPaletteInput {...props} value={value} onChange={setValue} />;
};

const meta = {
    title: 'Molecules/CommandPaletteInput',
    component: CommandPaletteInput,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[560px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        value: '',
        onChange: fn(),
        onKeyDown: fn(),
        placeholder: 'Type a command or search...',
        listboxId: 'palette-list',
        expanded: true,
    },
} satisfies Meta<typeof CommandPaletteInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A nested step shows where the user is above the root list. */
export const WithBreadcrumb: Story = {
    args: {
        breadcrumb: ['#12', 'Change status'],
        placeholder: 'Pick a status',
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByLabelText('Current step'),
        ).toHaveTextContent('Change status');
    },
};

export const WithCloseButton: Story = {
    args: { onClose: fn() },
};

export const Typing: Story = {
    render: (args) => <ControlledInput {...args} />,
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByRole('combobox');
        await userEvent.type(input, 'status');
        await expect(input).toHaveValue('status');
    },
};
