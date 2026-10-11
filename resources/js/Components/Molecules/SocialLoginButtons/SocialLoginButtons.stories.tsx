import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import SocialLoginButtons from './SocialLoginButtons';

const meta = {
    title: 'Molecules/SocialLoginButtons',
    component: SocialLoginButtons,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SocialLoginButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Only GitHub is wired up; Google and Microsoft are disabled placeholders. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('link', { name: 'Continue with GitHub' }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('button', {
                name: 'Continue with Google (coming soon)',
            }),
        ).toBeDisabled();
    },
};

export const CustomLayout: Story = {
    args: { className: 'grid-cols-1' },
};
