import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import FormField from './FormField';

const meta = {
    title: 'Molecules/FormField',
    component: FormField,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'email',
        label: 'Email',
        type: 'email',
        value: '',
        placeholder: 'you@company.com',
        onChange: () => {},
    },
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return (
            <FormField
                {...args}
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
        );
    },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByLabelText('Email');
        await userEvent.type(input, 'jane@orbit.dev');
        await expect(input).toHaveValue('jane@orbit.dev');
    },
};

export const WithIcon: Story = {
    args: { icon: 'Mail', required: true },
};

export const WithError: Story = {
    args: {
        value: 'not-an-email',
        error: 'Enter a valid email address.',
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Enter a valid email address.'),
        ).toBeVisible();
    },
};

export const Disabled: Story = {
    args: { value: 'jane@orbit.dev', isDisabled: true },
};
