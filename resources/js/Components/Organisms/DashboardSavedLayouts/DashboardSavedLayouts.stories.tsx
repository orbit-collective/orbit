import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { makeSavedLayout, makeWidget } from '@/tests/dashboardLayout';
import DashboardSavedLayouts from './DashboardSavedLayouts';

const meta = {
    title: 'Organisms/DashboardSavedLayouts',
    component: DashboardSavedLayouts,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px] rounded-xl bg-[var(--bg-color-hover)] p-3">
                <Story />
            </div>
        ),
    ],
    args: {
        layouts: [
            makeSavedLayout(1, 'Focus', [
                makeWidget('trend', { width: 120 }),
                makeWidget('completion'),
                makeWidget('priority_breakdown'),
            ]),
            makeSavedLayout(2, 'Overview'),
        ],
        onSave: fn(),
        onApply: fn(),
        onDelete: fn(),
    },
} satisfies Meta<typeof DashboardSavedLayouts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Apply Overview',
            }),
        );
        await expect(args.onApply).toHaveBeenCalled();
    },
};

export const Empty: Story = { args: { layouts: [] } };

export const SaveFailed: Story = {
    args: { error: 'You can keep at most 20 saved layouts. Delete one first.' },
};
