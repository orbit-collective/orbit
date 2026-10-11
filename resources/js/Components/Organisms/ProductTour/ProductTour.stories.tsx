import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent } from 'storybook/test';
import { TourStep } from '@/types/Tour';
import ProductTour from './ProductTour';

const steps: TourStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Orbit',
        icon: 'Hand',
        description: 'Take a 1-minute tour of the places you will use most.',
    },
    {
        id: 'target',
        target: 'story-target',
        placement: 'bottom',
        title: 'Spotlighted element',
        description: 'The page is dimmed except for this element.',
    },
    {
        id: 'done',
        icon: 'Rocket',
        title: "You're all set",
        description: 'That is the essentials.',
    },
];

const meta = {
    title: 'Organisms/ProductTour',
    component: ProductTour,
    parameters: { layout: 'fullscreen', inertia: { url: '/' } },
    args: { steps, onClose: fn() },
    decorators: [
        (Story) => (
            <div className="min-h-screen bg-[var(--bg-color)] p-10">
                <button
                    type="button"
                    data-tour="story-target"
                    className="rounded-lg border border-solid border-[var(--border-color)] bg-[var(--surface-color)] px-4 py-2 text-[var(--text-color)]"
                >
                    Tour target
                </button>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ProductTour>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A step without a target renders as a centered card. */
export const CenteredCard: Story = {
    play: async () => {
        await expect(await screen.findByText('Welcome to Orbit')).toBeVisible();
    },
};

/** Closing the tour reports back to the host. */
export const Closes: Story = {
    play: async ({ args }) => {
        await screen.findByText('Welcome to Orbit');
        const close = screen.getAllByRole('button', { name: /close|skip/i })[0];
        await userEvent.click(close);
        await expect(args.onClose).toHaveBeenCalled();
    },
};
