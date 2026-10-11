import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent } from 'storybook/test';
import BulkActionBar from './BulkActionBar';

const meta = {
    title: 'Molecules/BulkActionBar',
    component: BulkActionBar,
    parameters: { layout: 'fullscreen' },
    args: {
        selectedCount: 3,
        onBulkDelete: fn(),
        onClear: fn(),
        isDeleting: false,
    },
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bar renders in a portal at the bottom of the viewport. */
export const Default: Story = {
    play: async ({ args }) => {
        const toolbar = await screen.findByRole('toolbar', {
            name: 'Bulk actions',
        });
        await expect(toolbar).toHaveTextContent(/3\s*issues selected/);
        await userEvent.click(
            await screen.findByRole('button', { name: /delete selected/i }),
        );
        await expect(args.onBulkDelete).toHaveBeenCalledTimes(1);
    },
};

export const SingleIssue: Story = {
    args: { selectedCount: 1 },
    play: async () => {
        const toolbar = await screen.findByRole('toolbar');
        await expect(toolbar).toHaveTextContent(/1\s*issue selected/);
    },
};

export const Deleting: Story = {
    args: { isDeleting: true },
    play: async () => {
        await expect(
            await screen.findByRole('button', { name: /removing/i }),
        ).toBeDisabled();
    },
};

export const WithoutClear: Story = {
    args: { onClear: undefined },
};
