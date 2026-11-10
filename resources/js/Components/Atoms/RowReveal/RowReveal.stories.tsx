import type { Meta, StoryObj } from '@storybook/react-vite';
import RowReveal from './RowReveal';

const meta = {
    title: 'Atoms/RowReveal',
    component: RowReveal,
    parameters: { layout: 'centered' },
    args: { children: null },
} satisfies Meta<typeof RowReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rows rise one after another; the stagger stops growing after ten. */
export const Staggered: Story = {
    render: () => (
        <div className="w-72 divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
            {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name, i) => (
                <RowReveal
                    key={name}
                    index={i}
                    className="px-4 py-3 text-sm text-(--text-color)"
                >
                    {name}
                </RowReveal>
            ))}
        </div>
    ),
};
