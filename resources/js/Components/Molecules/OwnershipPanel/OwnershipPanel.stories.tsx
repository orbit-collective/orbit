import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import OwnershipPanel from './OwnershipPanel';

const meta = {
    title: 'Molecules/OwnershipPanel',
    component: OwnershipPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px]">
                <Story />
            </div>
        ),
    ],
    args: { onTransferRequest: fn() },
} satisfies Meta<typeof OwnershipPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Transfer ownership',
            }),
        );
        await expect(args.onTransferRequest).toHaveBeenCalled();
    },
};
