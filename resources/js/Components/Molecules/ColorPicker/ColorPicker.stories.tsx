import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import ColorPicker from './ColorPicker';

const Demo = (args: ComponentProps<typeof ColorPicker>) => {
    const [color, setColor] = useState(args.value);

    return (
        <div className="w-[296px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark-color)] p-3">
            <ColorPicker {...args} value={color} onChange={setColor} />
        </div>
    );
};

const meta = {
    title: 'Molecules/ColorPicker',
    component: ColorPicker,
    parameters: { layout: 'centered' },
    args: {
        value: '#2196f3',
        onChange: () => {},
        palette: LABEL_COLOR_PALETTE,
    },
    render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: dots to scroll and a rainbow tile that opens the rest. */
export const Closed: Story = {};

/** Open: the dots become tiles and a full picker with a hex field appears. */
export const Open: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'More colors' }),
        );
        await expect(
            within(canvasElement).getByLabelText('Hex color'),
        ).toBeVisible();
    },
};

/** A color the palette does not have is shown as its own selected swatch. */
export const CustomColor: Story = { args: { value: '#7038f4' } };
