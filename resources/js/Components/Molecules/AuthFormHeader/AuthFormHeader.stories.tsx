import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import AuthFormHeader from './AuthFormHeader';

const meta = {
    title: 'Molecules/AuthFormHeader',
    component: AuthFormHeader,
    parameters: { layout: 'centered' },
    args: {
        icon: 'LogIn',
        title: 'Welcome back',
        description: 'Sign in to continue to Orbit.',
    },
} satisfies Meta<typeof AuthFormHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', {
                name: 'Welcome back',
            }),
        ).toBeVisible();
    },
};

export const Register: Story = {
    args: {
        icon: 'UserPlus',
        title: 'Create your account',
        description: 'Start tracking issues in a minute.',
    },
};
