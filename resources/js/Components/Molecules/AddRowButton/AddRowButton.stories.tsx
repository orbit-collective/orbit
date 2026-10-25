import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import AddRowButton from './AddRowButton';

const meta = {
    title: 'Molecules/AddRowButton',
    component: AddRowButton,
    parameters: { layout: 'padded' },
    args: { label: 'Add priority', onClick: fn() },
} satisfies Meta<typeof AddRowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Add priority' }),
        );
        await expect(args.onClick).toHaveBeenCalled();
    },
};
