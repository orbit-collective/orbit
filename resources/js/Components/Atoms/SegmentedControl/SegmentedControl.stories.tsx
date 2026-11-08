import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import SegmentedControl from './SegmentedControl';

const meta = {
    title: 'Atoms/SegmentedControl',
    component: SegmentedControl,
    parameters: { layout: 'centered' },
    args: {
        label: 'Style',
        value: 'cards',
        options: [
            { value: 'cards', label: 'Cards' },
            { value: 'compact', label: 'Compact' },
        ],
        onChange: () => {},
    },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: React.ComponentProps<typeof SegmentedControl>) => {
    const [value, setValue] = useState<string | number>(args.value);

    return <SegmentedControl {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('button', { name: 'Compact' }));
        await expect(
            canvas.getByRole('button', { name: 'Compact' }),
        ).toHaveAttribute('aria-pressed', 'true');
    },
};

export const FullWidth: Story = {
    args: { fullWidth: true },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
};
