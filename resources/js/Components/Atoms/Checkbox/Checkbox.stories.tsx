import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import Checkbox from './Checkbox';

const meta = {
    title: 'Atoms/Checkbox',
    component: Checkbox,
    parameters: { layout: 'centered' },
    args: {
        id: 'subscribe',
        label: 'Notify me about updates',
        checked: false,
        onChange: () => {},
    },
    render: function Render(args) {
        const [checked, setChecked] = useState(args.checked);

        return (
            <Checkbox
                {...args}
                checked={checked}
                onChange={(e) => {
                    setChecked(e.target.checked);
                    args.onChange(e);
                }}
            />
        );
    },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const Disabled: Story = { args: { isDisabled: true } };

export const DisabledChecked: Story = {
    args: { isDisabled: true, checked: true },
};

export const TogglesOnClick: Story = {
    play: async ({ canvasElement }) => {
        const box = within(canvasElement).getByRole('checkbox', {
            name: 'Notify me about updates',
        });
        await expect(box).not.toBeChecked();
        await userEvent.click(box);
        await expect(box).toBeChecked();
    },
};
