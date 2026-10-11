import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import Input from './Input';

const meta = {
    title: 'Atoms/Input',
    component: Input,
    parameters: { layout: 'centered' },
    args: { value: '', onChange: () => {}, placeholder: 'Issue title' },
    argTypes: {
        variant: { control: 'inline-radio', options: ['default', 'modal'] },
    },
    decorators: [
        (Story) => (
            <div className="w-72">
                <Story />
            </div>
        ),
    ],
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return (
            <Input
                {...args}
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    args.onChange(e);
                }}
            />
        );
    },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { value: 'Fix the login redirect' } };

export const Modal: Story = { args: { variant: 'modal' } };

export const Password: Story = {
    args: { type: 'password', value: 'secret', autoComplete: 'off' },
};

export const Disabled: Story = {
    args: { isDisabled: true, value: 'Read only value' },
};

export const AcceptsTyping: Story = {
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByPlaceholderText('Issue title');
        await userEvent.type(input, 'Hello');
        await expect(input).toHaveValue('Hello');
    },
};
