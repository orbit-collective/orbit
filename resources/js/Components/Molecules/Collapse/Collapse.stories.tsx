import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Collapse from './Collapse';

function ToggleDemo() {
    const [open, setOpen] = useState(true);

    return (
        <div className="w-80 rounded-2xl bg-[var(--surface-color)] p-4">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="text-sm text-[var(--text-color)]"
            >
                {open ? 'Fold' : 'Unfold'}
            </button>
            <Collapse open={open}>
                <p className="pt-3 text-sm text-[var(--text-gray-color)]">
                    The body slides and fades with the shared easing.
                </p>
            </Collapse>
        </div>
    );
}

const meta = {
    title: 'Molecules/Collapse',
    component: Collapse,
    parameters: { layout: 'centered' },
    args: { open: true, children: null },
} satisfies Meta<typeof Collapse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
    render: () => <ToggleDemo />,
};

export const StartsClosed: Story = {
    render: () => (
        <Collapse open={false}>
            <p>You will not see this.</p>
        </Collapse>
    ),
};
