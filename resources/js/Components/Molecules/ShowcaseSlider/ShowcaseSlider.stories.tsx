import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ShowcaseSlider } from './ShowcaseSlider';

const meta = {
    title: 'Molecules/ShowcaseSlider',
    component: ShowcaseSlider,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    // A long interval keeps the story stable; AutoPlay shortens it.
    args: { autoPlayInterval: 600000 },
} satisfies Meta<typeof ShowcaseSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/Built for teams/),
        ).toBeInTheDocument();
    },
};

/** Selecting a dot jumps to that slide. */
export const SelectSlide: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const dots = canvas.getAllByRole('button');
        await userEvent.click(dots[2]);
        await expect(
            await canvas.findByText(/Automate daily routines/),
        ).toBeInTheDocument();
    },
};

/** Advances on its own; hovering or focusing the slider pauses it. */
export const AutoPlay: Story = {
    args: { autoPlayInterval: 3000 },
};
