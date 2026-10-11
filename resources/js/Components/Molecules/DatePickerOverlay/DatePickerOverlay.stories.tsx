import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import DatePickerOverlay from './DatePickerOverlay';

const meta = {
    title: 'Molecules/DatePickerOverlay',
    component: DatePickerOverlay,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="relative h-[460px] w-full bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        isOpen: true,
        showStartDate: true,
        showEndDate: false,
        startDate: '2026-10-14',
        onClose: fn(),
        onSelectStart: fn(),
        onSelectEnd: fn(),
    },
} satisfies Meta<typeof DatePickerOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StartDate: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            await within(canvasElement).findByRole('button', { name: '20' }),
        );
        await expect(args.onSelectStart).toHaveBeenCalled();
    },
};

/** The end date calendar cannot be earlier than the start date. */
export const EndDate: Story = {
    args: {
        showStartDate: false,
        showEndDate: true,
        startDate: '2026-10-10',
        endDate: '2026-10-18',
    },
};

export const Closed: Story = {
    args: { isOpen: false },
};
