import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import TabSelection from './TabSelection';

const meta = {
    title: 'Molecules/TabSelection',
    component: TabSelection,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        tabs: [{ name: 'Comments', count: 3 }, { name: 'Activity' }],
        selectedTab: 'Comments',
        idPrefix: 'story-tabs',
        onSelectTab: fn(),
    },
} satisfies Meta<typeof TabSelection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('tab', { name: /Comments/ }),
        ).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(canvas.getByRole('tab', { name: 'Activity' }));
        await expect(args.onSelectTab).toHaveBeenCalledWith('Activity');
    },
};

export const ActivitySelected: Story = {
    args: { selectedTab: 'Activity' },
};

/** On narrow containers the tabs scroll horizontally. */
export const Narrow: Story = {
    decorators: [
        (Story) => (
            <div className="w-[160px]">
                <Story />
            </div>
        ),
    ],
};
