import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Reveal from './Reveal';

function SwapDemo() {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="w-72 space-y-3">
            <button
                type="button"
                className="text-sm text-[var(--text-color)]"
                onClick={() => setLoaded((v) => !v)}
            >
                Swap
            </button>
            <Reveal key={loaded ? 'data' : 'loading'}>
                <p className="rounded-xl bg-[var(--surface-color)] p-4 text-sm text-[var(--text-color)]">
                    {loaded ? 'Here is the data.' : 'Loading…'}
                </p>
            </Reveal>
        </div>
    );
}

const meta = {
    title: 'Atoms/Reveal',
    component: Reveal,
    parameters: { layout: 'centered' },
    args: { children: null },
} satisfies Meta<typeof Reveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwapOnKey: Story = {
    render: () => <SwapDemo />,
};
