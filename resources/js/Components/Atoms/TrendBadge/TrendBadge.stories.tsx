import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import TrendBadge from './TrendBadge';

const meta = {
    title: 'Atoms/TrendBadge',
    component: TrendBadge,
    parameters: { layout: 'centered' },
    args: { value: 2.46 },
} satisfies Meta<typeof TrendBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rising: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('2.46%')).toBeVisible();
    },
};

export const Falling: Story = { args: { value: -4.7 } };

/** For numbers where more is worse, such as errors. */
export const RisingIsBad: Story = {
    args: { value: 18, positiveIsGood: false },
};
