import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import LanguageBar from './LanguageBar';

const meta = {
    title: 'Molecules/LanguageBar',
    component: LanguageBar,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        shares: [
            { name: 'TypeScript', percent: 52.4, color: '#3178c6' },
            { name: 'PHP', percent: 38.1, color: '#4f5d95' },
            { name: 'CSS', percent: 6.5, color: '#663399' },
            { name: 'Other', percent: 3, color: '#757575' },
        ],
    },
} satisfies Meta<typeof LanguageBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('TypeScript'),
        ).toBeVisible();
    },
};
