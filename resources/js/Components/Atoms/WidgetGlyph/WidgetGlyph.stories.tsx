import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeWidget, makeStat } from '@/tests/dashboardLayout';
import WidgetGlyph from './WidgetGlyph';

const meta = {
    title: 'Atoms/WidgetGlyph',
    component: WidgetGlyph,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div
                className="h-[130px] w-[260px]"
                style={{ ['--u' as string]: '2.6px' }}
            >
                <Story />
            </div>
        ),
    ],
    args: { widget: makeWidget('trend', { variant: 'area' }) },
} satisfies Meta<typeof WidgetGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trend: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByTestId('widget-glyph'),
        ).toHaveAttribute('data-variant', 'area');
    },
};

export const Completion: Story = {
    args: { widget: makeWidget('completion', { variant: 'ring' }) },
};

export const Priority: Story = {
    args: { widget: makeWidget('priority_breakdown', { variant: 'donut' }) },
};

export const Activity: Story = {
    args: { widget: makeWidget('activity') },
};

export const Projects: Story = {
    args: { widget: makeWidget('projects', { variant: 'grid' }) },
};

export const Stat: Story = {
    args: { widget: makeStat('critical', { variant: 'glass' }) },
    decorators: [
        (Story) => (
            <div
                className="h-[60px] w-[200px]"
                style={{ ['--u' as string]: '2px' }}
            >
                <Story />
            </div>
        ),
    ],
};
