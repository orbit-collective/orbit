import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import ErrorScreen from './ErrorScreen';

const meta = {
    title: 'Organisms/ErrorScreen',
    component: ErrorScreen,
    parameters: { layout: 'fullscreen' },
    args: { status: 404, path: '/projects/abc' },
} satisfies Meta<typeof ErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFound: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Page not found')).toBeInTheDocument();
        await expect(canvas.getByText('/projects/abc')).toBeInTheDocument();
    },
};

export const Forbidden: Story = {
    args: { status: 403 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Access denied'),
        ).toBeInTheDocument();
    },
};

export const ServerError: Story = {
    args: { status: 500, path: undefined },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Try again'),
        ).toBeInTheDocument();
    },
};

export const Maintenance: Story = {
    args: { status: 503, path: undefined },
};
