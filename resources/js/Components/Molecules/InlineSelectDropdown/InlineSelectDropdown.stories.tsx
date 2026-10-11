import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import InlineSelectDropdown from './InlineSelectDropdown';

const options = [
    { value: 'summary', label: 'Summary', icon: 'Type' },
    { value: 'description', label: 'Description', icon: 'AlignLeft' },
    { value: 'priority', label: 'Priority', icon: 'Flag', color: '#f44336' },
];

const meta = {
    title: 'Molecules/InlineSelectDropdown',
    component: InlineSelectDropdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="h-[260px]">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'Map to',
        placeholder: 'Choose a field',
        options,
        value: null,
        onChange: () => {},
    },
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return (
            <InlineSelectDropdown {...args} value={value} onChange={setValue} />
        );
    },
} satisfies Meta<typeof InlineSelectDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const trigger = within(canvasElement).getByRole('button', {
            name: 'Map to',
        });
        await expect(trigger).toHaveTextContent('Choose a field');
        await userEvent.click(trigger);
        await userEvent.click(
            await within(document.body).findByText('Description'),
        );
        await expect(trigger).toHaveTextContent('Description');
    },
};

export const Selected: Story = {
    args: { value: 'priority' },
};

/** Inside an already-tinted surface the selection uses the text color. */
export const Subtle: Story = {
    args: { value: 'summary', subtle: true },
};

export const Disabled: Story = {
    args: { value: 'summary', disabled: true },
};
