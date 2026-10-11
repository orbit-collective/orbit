import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import EditableText from './EditableText';

const meta = {
    title: 'Atoms/EditableText',
    component: EditableText,
    parameters: { layout: 'centered' },
    args: {
        value: 'Fix the login redirect',
        onSave: fn(),
        placeholder: 'Add a title',
    },
    decorators: [
        (Story) => (
            <div className="w-96 text-[var(--text-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EditableText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Heading: Story = {
    args: { as: 'h1', displayClassName: 'text-2xl font-semibold' },
};

export const Empty: Story = {
    args: { value: '', emptyText: 'No description yet' },
};

export const Multiline: Story = {
    args: {
        multiline: true,
        value: 'First line of the description.\nSecond line.',
    },
};

export const CustomDisplay: Story = {
    args: {
        renderDisplay: (value) => (
            <strong className="text-[var(--accent-color)]">{value}</strong>
        ),
    },
};

export const Disabled: Story = { args: { disabled: true } };

export const SavesOnEnter: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        const input = canvas.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.type(input, 'New title{Enter}');
        await expect(args.onSave).toHaveBeenCalledWith('New title');
    },
};

export const EscapeCancels: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await userEvent.type(canvas.getByRole('textbox'), 'abc{Escape}');
        await expect(args.onSave).not.toHaveBeenCalled();
    },
};
