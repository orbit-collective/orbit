import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import PasswordField from './PasswordField';

const ControlledField = (props: ComponentProps<typeof PasswordField>) => {
    const [value, setValue] = useState(props.value);
    return (
        <PasswordField
            {...props}
            value={value}
            onChange={(event) => setValue(event.target.value)}
        />
    );
};

const meta = {
    title: 'Molecules/PasswordField',
    component: PasswordField,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'password',
        label: 'Password',
        value: '',
        onChange: () => {},
    },
    render: (args) => <ControlledField {...args} />,
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText(/Password/, { selector: 'input' });
        await userEvent.type(input, 'hunter2');
        await expect(input).toHaveAttribute('type', 'password');
        await userEvent.click(canvas.getByLabelText('Show password'));
        await expect(input).toHaveAttribute('type', 'text');
        await expect(input).toHaveValue('hunter2');
    },
};

export const Required: Story = {
    args: { required: true },
};

export const WithError: Story = {
    args: {
        value: 'short',
        error: 'The password must be at least 8 characters.',
    },
};

export const Disabled: Story = {
    args: { isDisabled: true },
};
