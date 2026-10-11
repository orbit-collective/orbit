import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import TextArea from './TextArea';

const meta = {
    title: 'Atoms/TextArea',
    component: TextArea,
    parameters: { layout: 'centered' },
    args: {
        value: '',
        onChange: fn(),
        placeholder: 'Describe the issue...',
    },
    argTypes: {
        variant: { control: 'inline-radio', options: ['default', 'modal'] },
        isDisabled: { control: 'boolean' },
    },
    decorators: [
        (Story) => (
            <div className="w-[480px] max-w-full">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof TextArea>;

const ControlledTextArea = (args: ComponentProps<typeof TextArea>) => {
    const [value, setValue] = useState('');
    return (
        <TextArea
            {...args}
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    );
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Modal: Story = { args: { variant: 'modal' } };

export const Filled: Story = {
    args: {
        value: 'Saving a project fails when the name contains an emoji.\n\nSteps to reproduce:\n1. Open settings\n2. Rename the project',
    },
};

export const Disabled: Story = {
    args: { isDisabled: true, value: 'Read-only content' },
};

/** Controlled wrapper so typing actually updates the value. */
export const Typing: Story = {
    render: (args) => <ControlledTextArea {...args} />,
    play: async ({ canvasElement }) => {
        const textarea = within(canvasElement).getByPlaceholderText(
            'Describe the issue...',
        );
        await userEvent.type(textarea, 'Hello');
        await expect(textarea).toHaveValue('Hello');
    },
};
