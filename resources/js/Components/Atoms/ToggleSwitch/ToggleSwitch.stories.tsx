import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import ToggleSwitch from './ToggleSwitch';

const meta = {
    title: 'Atoms/ToggleSwitch',
    component: ToggleSwitch,
    parameters: { layout: 'centered' },
    args: { checked: false, onChange: fn() },
} satisfies Meta<typeof ToggleSwitch>;

const ControlledToggle = (args: ComponentProps<typeof ToggleSwitch>) => {
    const [checked, setChecked] = useState(false);
    return (
        <ToggleSwitch
            {...args}
            checked={checked}
            onChange={(next) => {
                setChecked(next);
                args.onChange(next);
            }}
        />
    );
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { checked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledOn: Story = { args: { disabled: true, checked: true } };

/** Controlled wrapper: clicking flips the state and reports it through `onChange`. */
export const Interactive: Story = {
    render: (args) => <ControlledToggle {...args} />,
    play: async ({ canvasElement }) => {
        const toggle = within(canvasElement).getByRole('button');
        await userEvent.click(toggle);
        await expect(toggle.querySelector('span')).toHaveClass('translate-x-4');
    },
};
