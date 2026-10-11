import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import Button from '@/Components/Atoms/Button/Button';
import SelectionDropdown from './SelectionDropdown';

const options = [
    { label: 'ID', value: 'id' },
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Assignee', value: 'assignee' },
    { label: 'Priority', value: 'priority', disabled: true },
];

const meta = {
    title: 'Molecules/SelectionDropdown',
    component: SelectionDropdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[300px] w-[260px] justify-end">
                <Story />
            </div>
        ),
    ],
    args: {
        options,
        selectedValues: ['id', 'title', 'status'],
        onChange: fn(),
        trigger: <Button>Columns</Button>,
    },
} satisfies Meta<typeof SelectionDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Toggle rows keep the menu open so several columns can be changed at once. */
export const Checkboxes: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Columns' }),
        );
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            await body.findByRole('menuitemcheckbox', { name: 'Assignee' }),
        );
        await expect(args.onChange).toHaveBeenCalledWith('assignee');
    },
};

/** Radio rows, a separator and an action row in the same menu. */
export const MixedKinds: Story = {
    args: {
        options: [
            { label: 'Group by', value: 'group', kind: 'separator' },
            { label: 'Status', value: 'g-status', kind: 'radio' },
            { label: 'Assignee', value: 'g-assignee', kind: 'radio' },
            { label: 'Columns', value: 'cols', kind: 'separator' },
            { label: 'Title', value: 'title' },
            { label: 'Reset to defaults', value: 'reset', kind: 'action' },
        ],
        selectedValues: ['g-status', 'title'],
    },
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Columns' }),
        );
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            await body.findByRole('menuitemradio', { name: 'Status' }),
        ).toBeVisible();
    },
};

export const Interactive: Story = {
    render: function Render(args) {
        const [selected, setSelected] = useState(args.selectedValues);
        return (
            <SelectionDropdown
                {...args}
                selectedValues={selected}
                onChange={(value) =>
                    setSelected((prev) =>
                        prev.includes(value)
                            ? prev.filter((v) => v !== value)
                            : [...prev, value],
                    )
                }
            />
        );
    },
};
