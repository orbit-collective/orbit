import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Alert } from './Alert';

const meta = {
    title: 'Molecules/Alert',
    component: Alert,
    parameters: { layout: 'centered' },
    args: {
        onClose: fn(),
        alert: { id: 'a-1', type: 'success', message: 'Issue #12 was saved.' },
    },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Close Alert' }),
        );
        await expect(args.onClose).toHaveBeenCalledTimes(1);
    },
};

export const ErrorAlert: Story = {
    args: {
        alert: {
            id: 'a-2',
            type: 'error',
            message: 'Could not save the issue.',
        },
    },
};

export const Warning: Story = {
    args: {
        alert: {
            id: 'a-3',
            type: 'warning',
            message: 'GitHub sync is failing.',
        },
    },
};

export const Information: Story = {
    args: {
        alert: {
            id: 'a-4',
            type: 'information',
            message: 'A new version is available.',
        },
    },
};

/** An `actionUrl` adds a "View details" link. */
export const WithAction: Story = {
    args: {
        alert: {
            id: 'a-5',
            type: 'success',
            message: 'Import finished.',
            actionUrl: '/projects/1',
        },
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('link', { name: 'View details' }),
        ).toHaveAttribute('href', '/projects/1');
    },
};
