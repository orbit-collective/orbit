import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import StatusPill from './StatusPill';

const meta = {
    title: 'Atoms/StatusPill',
    component: StatusPill,
    parameters: { layout: 'centered' },
    args: { tone: 'success', icon: 'CircleCheck', children: 'Checks passed' },
    argTypes: {
        tone: {
            control: 'select',
            options: [
                'success',
                'danger',
                'warning',
                'accent',
                'info',
                'neutral',
            ],
        },
    },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Checks passed'),
        ).toBeVisible();
    },
};

export const Tones: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <StatusPill tone="success" icon="GitPullRequest">
                Open
            </StatusPill>
            <StatusPill tone="accent" icon="GitMerge">
                Merged
            </StatusPill>
            <StatusPill tone="danger" icon="CircleX">
                Checks failed
            </StatusPill>
            <StatusPill tone="warning" icon="LoaderCircle" spinning>
                Checks running
            </StatusPill>
            <StatusPill tone="info" icon="MessageSquare">
                Commented
            </StatusPill>
            <StatusPill tone="neutral" icon="Minus">
                No checks
            </StatusPill>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Merged')).toBeVisible();
    },
};
