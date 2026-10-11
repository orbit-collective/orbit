import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ShowcaseDots } from './ShowcaseDots';

const meta = {
    title: 'Atoms/ShowcaseDots',
    component: ShowcaseDots,
    parameters: { layout: 'centered' },
    args: { count: 4, activeIndex: 0, onSelect: fn() },
} satisfies Meta<typeof ShowcaseDots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MiddleActive: Story = { args: { count: 6, activeIndex: 3 } };

export const SelectsSlide: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('button', { name: 'Go to slide 1' }),
        ).toHaveAttribute('aria-current', 'true');
        await userEvent.click(
            canvas.getByRole('button', { name: 'Go to slide 3' }),
        );
        await expect(args.onSelect).toHaveBeenCalledWith(2);
    },
};
