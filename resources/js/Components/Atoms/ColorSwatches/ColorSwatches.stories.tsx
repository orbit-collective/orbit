import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
    DASHBOARD_COLORS,
    DASHBOARD_COLOR_VALUES,
} from '@/utils/dashboardColors';
import ColorSwatches from './ColorSwatches';

const meta = {
    title: 'Atoms/ColorSwatches',
    component: ColorSwatches,
    parameters: { layout: 'centered' },
    args: {
        label: 'Color',
        value: 'accent',
        options: DASHBOARD_COLORS.map((color) => ({
            value: color,
            label: color.charAt(0).toUpperCase() + color.slice(1),
            color: DASHBOARD_COLOR_VALUES[color],
        })),
        onChange: () => {},
    },
} satisfies Meta<typeof ColorSwatches>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: React.ComponentProps<typeof ColorSwatches>) => {
    const [value, setValue] = useState(args.value);

    return <ColorSwatches {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('button', { name: 'Warning' }));
        await expect(
            canvas.getByRole('button', { name: 'Warning' }),
        ).toHaveAttribute('aria-pressed', 'true');
    },
};
