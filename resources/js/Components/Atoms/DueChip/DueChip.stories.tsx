import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import DueChip from './DueChip';

const NOW = new Date(2026, 10, 10, 12, 0);

const meta = {
    title: 'Atoms/DueChip',
    component: DueChip,
    parameters: { layout: 'centered' },
    args: { endDate: '2026-11-14', now: NOW },
} satisfies Meta<typeof DueChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Soon: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('in 4d'),
        ).toBeInTheDocument();
    },
};

export const Overdue: Story = { args: { endDate: '2026-11-05' } };

export const Today: Story = { args: { endDate: '2026-11-10' } };

export const Later: Story = { args: { endDate: '2026-12-24' } };

/** Every tone side by side. */
export const Tones: Story = {
    render: () => (
        <div className="flex gap-2">
            {['2026-11-05', '2026-11-10', '2026-11-12', '2026-12-24'].map(
                (date) => (
                    <DueChip key={date} endDate={date} now={NOW} />
                ),
            )}
        </div>
    ),
};
