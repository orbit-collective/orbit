import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import AnimatedNumber from './AnimatedNumber';

const meta = {
    title: 'Atoms/AnimatedNumber',
    component: AnimatedNumber,
    parameters: { layout: 'centered' },
    args: {
        value: 725,
        className: 'text-4xl font-bold text-[var(--text-color)]',
    },
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Press the button: the number glides to its new value. */
export const Updating: Story = {
    render: (args) => {
        const [value, setValue] = useState(725);

        return (
            <div className="flex flex-col items-center gap-4">
                <AnimatedNumber {...args} value={value} />
                <button
                    type="button"
                    className="rounded-md border border-[var(--border-color)] px-3 py-1 text-sm text-[var(--text-color)]"
                    onClick={() => setValue((v) => v + 137)}
                >
                    Add 137
                </button>
            </div>
        );
    },
};
