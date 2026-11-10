import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
    PreviewBar,
    PreviewBlock,
    PreviewDot,
    PreviewStage,
} from './PreviewMotion';

const meta = {
    title: 'Molecules/PreviewMotion',
    component: PreviewStage,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof PreviewStage>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
    const [play, setPlay] = useState(0);

    return (
        <div className="w-64 space-y-3">
            <PreviewStage
                playKey={play}
                className="space-y-2 rounded-lg border border-(--border-color) p-3"
            >
                <div className="flex items-center gap-2">
                    <PreviewDot className="h-2 w-2 rounded-full bg-(--accent-color)" />
                    <PreviewBar className="h-1.5 w-2/3 rounded-full bg-(--border-color-strong)" />
                </div>
                <PreviewBlock className="h-4 rounded-md bg-(--bg-light-color)" />
                <PreviewBlock className="h-4 rounded-md bg-(--bg-light-color)" />
            </PreviewStage>
            <button
                type="button"
                className="text-sm text-(--text-color)"
                onClick={() => setPlay((n) => n + 1)}
            >
                Draw again
            </button>
        </div>
    );
}

/** Bars grow, dots pop and blocks rise one after another; the button draws it again. */
export const Default: Story = {
    render: () => <Demo />,
};
