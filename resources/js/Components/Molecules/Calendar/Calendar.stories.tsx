import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Calendar from './Calendar';

const meta = {
    title: 'Molecules/Calendar',
    component: Calendar,
    parameters: { layout: 'centered' },
    args: {
        selectedDate: new Date(2026, 9, 14),
        onSelect: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: '20' }),
        );
        await expect(args.onSelect).toHaveBeenCalled();
    },
};

export const NoSelection: Story = {
    args: { selectedDate: undefined },
};

/** Days before `minDate` (the start date of a range) cannot be picked. */
export const EndDateAfterStart: Story = {
    args: {
        minDate: new Date(2026, 9, 10),
        rangeStart: new Date(2026, 9, 10),
        selectedDate: new Date(2026, 9, 18),
    },
};
