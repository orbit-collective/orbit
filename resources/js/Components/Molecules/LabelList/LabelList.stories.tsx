import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import LabelList from './LabelList';

const meta = {
    title: 'Molecules/LabelList',
    component: LabelList,
    parameters: { layout: 'centered' },
    args: {
        labels: ['bug', 'ux'],
    },
} satisfies Meta<typeof LabelList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Single: Story = {
    args: { labels: ['feature'] },
};

/** Past two labels the rest collapse into a "+N" menu. */
export const Overflow: Story = {
    args: {
        labels: ['bug', 'design', 'ux', 'feature', 'performance'],
    },
    decorators: [
        (Story) => (
            <div className="h-[200px]">
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: '+3' }),
        );
        await expect(
            await within(document.body).findByText('More Labels'),
        ).toBeVisible();
    },
};

export const Closed: Story = {
    args: { labels: ['bug', 'design', 'ux'], isClosed: true },
};
