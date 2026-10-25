import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import { PRIORITY_ICON_OPTIONS } from '@/utils/priorityIcons';
import AppearancePicker from './AppearancePicker';

const meta = {
    title: 'Molecules/AppearancePicker',
    component: AppearancePicker,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="h-[420px] pt-40">
                <Story />
            </div>
        ),
    ],
    args: {
        color: '#2196f3',
        onColorChange: () => {},
        palette: LABEL_COLOR_PALETTE,
        ariaLabel: 'Label color',
        children: null,
    },
} satisfies Meta<typeof AppearancePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const ColorOnlyDemo = (args: ComponentProps<typeof AppearancePicker>) => {
    const [color, setColor] = useState(args.color);

    return (
        <AppearancePicker {...args} color={color} onColorChange={setColor}>
            <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: color }}
            />
        </AppearancePicker>
    );
};

const ColorAndIconDemo = (args: ComponentProps<typeof AppearancePicker>) => {
    const [color, setColor] = useState('#f44336');
    const [icon, setIcon] = useState('Flame');

    return (
        <AppearancePicker
            {...args}
            ariaLabel="Priority icon and color"
            color={color}
            onColorChange={setColor}
            icon={icon}
            onIconChange={setIcon}
            iconOptions={PRIORITY_ICON_OPTIONS}
        >
            <Icon name={icon as 'Flame'} size={17} color={color} />
        </AppearancePicker>
    );
};

/** Color only, drawn as a dot: how a label is styled. */
export const ColorOnly: Story = {
    render: (args) => <ColorOnlyDemo {...args} />,
};

/** Color and icon together: how a priority is styled. */
export const ColorAndIcon: Story = {
    render: (args) => <ColorAndIconDemo {...args} />,
};
