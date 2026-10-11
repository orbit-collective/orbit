import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const meta = {
    title: 'Molecules/PasswordStrengthMeter',
    component: PasswordStrengthMeter,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    args: { password: 'abc' },
} satisfies Meta<typeof PasswordStrengthMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Weak: Story = {};

export const Fair: Story = {
    args: { password: 'abcdefgh12' },
};

export const Strong: Story = {
    args: { password: 'C0rrect-Horse-Battery-Staple!' },
};

/** An empty password renders nothing. */
export const Empty: Story = {
    args: { password: '' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByText(/./)).toBeNull();
    },
};
