import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import DangerZonePanel from './DangerZonePanel';

const meta = {
    title: 'Molecules/DangerZonePanel',
    component: DangerZonePanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px]">
                <Story />
            </div>
        ),
    ],
    args: {
        projectName: 'Orbit',
        onDeleteRequest: fn(),
    },
} satisfies Meta<typeof DangerZonePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Delete project',
            }),
        );
        await expect(args.onDeleteRequest).toHaveBeenCalledTimes(1);
    },
};

export const LongProjectName: Story = {
    args: {
        projectName: 'A very long project name that goes on and on and on',
    },
};
