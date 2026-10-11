import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { issues, makeIssue } from '@/stories/fixtures';
import CalendarView from './CalendarView';

const pad = (value: number) => String(value).padStart(2, '0');

/** A `YYYY-MM-DD` key a number of days from today, so the sample data always falls in the visible month. */
const dayKey = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const scheduled = issues.map((issue, index) =>
    makeIssue({
        ...issue,
        start_date: dayKey(index - 2),
        end_date: dayKey(index - 2 + (index % 3)),
    }),
);

const meta = {
    title: 'Organisms/CalendarView',
    component: CalendarView,
    decorators: [
        (Story) => (
            <div className="min-h-[640px] bg-[var(--bg-color)] p-6">
                <Story />
            </div>
        ),
    ],
    args: { issues: scheduled },
} satisfies Meta<typeof CalendarView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { issues: [] } };

/** More issues than fit in a day cell collapse behind a counter. */
export const CrowdedDay: Story = {
    args: {
        issues: Array.from({ length: 8 }, (_, index) =>
            makeIssue({
                id: String(900 + index),
                number: 900 + index,
                title: `Busy day task ${index + 1}`,
                start_date: dayKey(0),
                end_date: dayKey(0),
            }),
        ),
    },
};

export const WeekView: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'week' }));
        await expect(
            canvas.getByRole('button', { name: 'week' }),
        ).toBeInTheDocument();
    },
};

export const NavigateMonths: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Today' }));
    },
};
