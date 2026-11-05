import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import CardHeader from './CardHeader';

function CollapsibleDemo(props: ComponentProps<typeof CardHeader>) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <CardHeader
            {...props}
            collapsed={collapsed}
            collapsedSummary="12 errors today"
            onToggleCollapse={() => setCollapsed((v) => !v)}
        />
    );
}

const meta = {
    title: 'Molecules/CardHeader',
    component: CardHeader,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px] rounded-2xl bg-[var(--surface-color)] p-5">
                <Story />
            </div>
        ),
    ],
    args: {
        icon: 'Bug',
        title: 'Recent errors',
        description: 'The newest errors from the log.',
    },
} satisfies Meta<typeof CardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const Collapsible: Story = {
    render: (args) => <CollapsibleDemo {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getByText('12 errors today')).toBeVisible();
    },
};
