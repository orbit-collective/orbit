import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Icon from '@/Components/Atoms/Icon/Icon';
import ModalHeader from './ModalHeader';

const meta = {
    title: 'Molecules/ModalHeader',
    component: ModalHeader,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px] rounded-xl bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
    args: { title: 'Create issue', onClose: fn() },
} satisfies Meta<typeof ModalHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Create issue')).toBeVisible();
        await userEvent.click(canvas.getByRole('button'));
        await expect(args.onClose).toHaveBeenCalled();
    },
};

export const WithIcon: Story = {
    args: {
        icon: (
            <Icon
                name="FolderPlus"
                size={18}
                className="text-[var(--accent-color)]"
            />
        ),
    },
};

export const LongTitle: Story = {
    args: {
        title: 'A very long modal title that keeps going and going to test wrapping behavior',
    },
};
