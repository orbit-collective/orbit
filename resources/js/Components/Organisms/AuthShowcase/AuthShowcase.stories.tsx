import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import AuthShowcase from './AuthShowcase';

const meta = {
    title: 'Organisms/AuthShowcase',
    component: AuthShowcase,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            // The showcase only renders from the lg breakpoint up, as the side
            // panel of the auth pages.
            <div className="grid h-[640px] grid-cols-1 lg:grid-cols-2">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Plan, track and ship work in one orbit.',
        description:
            'Issues, boards and calendars for teams that want less ceremony.',
    },
} satisfies Meta<typeof AuthShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/plan, track and ship/i),
        ).toBeInTheDocument();
    },
};

export const LongCopy: Story = {
    args: {
        title: 'Everything your team needs to move from idea to release without losing track of what matters.',
        description:
            'Orbit keeps issues, projects, labels and workflows together so planning, triage and delivery stay in sync, whether you are a team of two or two hundred.',
    },
};
