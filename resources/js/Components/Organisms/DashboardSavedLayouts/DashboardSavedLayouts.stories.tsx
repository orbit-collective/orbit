import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import {
    makeDashboardLayout,
    makeSavedLayout,
    makeWidget,
} from '@/tests/dashboardLayout';
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
        currentWidgets: makeDashboardLayout().widgets,
        onApply: fn(),
        onRename: fn(),
        onOverwrite: fn(),
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

/** The saved layout that is on the dashboard now is marked as the current one. */
export const CurrentLayout: Story = {
    play: async ({ canvasElement }) => {
        await waitFor(() =>
            expect(within(canvasElement).getByText('Current')).toBeVisible(),
        );
    },
};

export const Renaming: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Rename Focus' }),
        );
        await expect(
            within(canvasElement).getByRole('button', {
                name: 'Save the name of Focus',
            }),
        ).toBeVisible();
    },
};
