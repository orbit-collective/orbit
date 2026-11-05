import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import CollapseAllButton from './CollapseAllButton';

const meta = {
    title: 'Molecules/CollapseAllButton',
    component: CollapseAllButton,
    parameters: { layout: 'centered' },
    args: { allCollapsed: false, onToggle: () => {} },
} satisfies Meta<typeof CollapseAllButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapse: Story = {};

export const Expand: Story = { args: { allCollapsed: true } };

function Toggling() {
    const [all, setAll] = useState(false);

    return (
        <CollapseAllButton
            allCollapsed={all}
            onToggle={() => setAll((v) => !v)}
        />
    );
}

/** Click it: label and icon swap. */
export const Interactive: Story = {
    render: () => <Toggling />,
};
