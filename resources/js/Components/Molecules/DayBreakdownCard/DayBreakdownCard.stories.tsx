import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import DayBreakdownCard from './DayBreakdownCard';

const row = (
    key: string,
    label: string,
    value: number,
    color: string,
    delta?: number,
) => ({
    key,
    label,
    value,
    color,
    delta,
});

const meta = {
    title: 'Molecules/DayBreakdownCard',
    component: DayBreakdownCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[340px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Errors this week',
        icon: 'Bug',
        headline: (total: number) => `${total} logged`,
        headlineTrend: { value: 18.5, positiveIsGood: false },
        days: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map(
            (label, i) => ({
                key: `day-${i}`,
                label,
                dayNumber: String(29 + i > 31 ? 29 + i - 31 : 29 + i).padStart(
                    2,
                    '0',
                ),
                rows: [
                    row(
                        'error',
                        'Errors',
                        i * 2,
                        '#f44336',
                        i === 0 ? undefined : 12,
                    ),
                    row(
                        'critical',
                        'Critical',
                        i % 3,
                        '#9c27b0',
                        i === 0 ? undefined : -8,
                    ),
                    row('warning', 'Warnings', i * 4, '#ff9800'),
                ],
            }),
        ),
    },
} satisfies Meta<typeof DayBreakdownCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getAllByRole('tab')[1]);
        await expect(canvas.getAllByRole('tab')[1]).toHaveAttribute(
            'aria-selected',
            'true',
        );
    },
};

export const Empty: Story = {
    args: { days: [], emptyText: 'Nothing in the log.' },
};
