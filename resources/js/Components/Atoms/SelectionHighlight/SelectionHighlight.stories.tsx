import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import SelectionHighlight from './SelectionHighlight';

const meta = {
    title: 'Atoms/SelectionHighlight',
    component: SelectionHighlight,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof SelectionHighlight>;

export default meta;
type Story = StoryObj<typeof meta>;

function Group() {
    const [selected, setSelected] = useState('b');

    return (
        <div className="flex gap-3">
            {['a', 'b', 'c'].map((id) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    className="relative h-16 w-28 rounded-xl border border-(--border-color) bg-(--surface-color) text-sm text-(--text-color)"
                >
                    {selected === id && (
                        <SelectionHighlight layoutId="story-group" />
                    )}
                    <span className="relative">Option {id.toUpperCase()}</span>
                </button>
            ))}
        </div>
    );
}

/** Click another option: the frame glides across instead of flipping. */
export const Gliding: Story = {
    render: () => <Group />,
};
