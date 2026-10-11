import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AlertContainer } from './AlertContainer';

const meta = {
    title: 'Organisms/AlertContainer',
    component: AlertContainer,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="relative h-[360px] bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        removeAlert: fn(),
        alerts: [
            {
                id: '1',
                type: 'success',
                message: 'Issue #12 was updated.',
            },
        ],
    },
} satisfies Meta<typeof AlertContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The stack is pinned to the top right and lists every intent. */
export const AllTypes: Story = {
    args: {
        alerts: [
            { id: '1', type: 'success', message: 'Project created.' },
            { id: '2', type: 'error', message: 'Could not save the issue.' },
            {
                id: '3',
                type: 'warning',
                message: 'You are nearly at the limit.',
            },
            {
                id: '4',
                type: 'information',
                message: 'Marcus Lee assigned #12 to you.',
                actionUrl: '/projects/1/issues/101',
            },
        ],
    },
};

export const Empty: Story = { args: { alerts: [] } };

export const Dismiss: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Close Alert' }),
        );
        await expect(args.removeAlert).toHaveBeenCalledWith('1');
    },
};
