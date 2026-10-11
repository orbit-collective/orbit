import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import EditableSelect from './EditableSelect';

const options = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

const meta = {
    title: 'Molecules/EditableSelect',
    component: EditableSelect,
    parameters: { layout: 'centered' },
    args: {
        value: 'medium',
        options,
        header: 'Priority',
        onSave: fn(),
    },
} satisfies Meta<typeof EditableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picking a different option saves it straight away. */
export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /medium/i }),
        );
        await userEvent.click(await within(document.body).findByText('High'));
        await expect(args.onSave).toHaveBeenCalledWith('high');
    },
};

export const CustomValue: Story = {
    args: {
        bare: true,
        renderValue: (value) => (
            <span className="flex items-center gap-2 text-sm capitalize text-[var(--text-color)]">
                <StatusDot status={value as 'low'} size="sm" />
                {value}
            </span>
        ),
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};
