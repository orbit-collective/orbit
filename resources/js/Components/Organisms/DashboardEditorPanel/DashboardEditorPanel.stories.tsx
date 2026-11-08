import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
    DASHBOARD_CATALOG,
    makeSavedLayout,
    makeWidget,
} from '@/tests/dashboardLayout';
import DashboardEditorPanel from './DashboardEditorPanel';

const meta = {
    title: 'Organisms/DashboardEditorPanel',
    component: DashboardEditorPanel,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="flex h-[640px] justify-end">
                <Story />
            </div>
        ),
    ],
    args: {
        catalog: DASHBOARD_CATALOG,
        widgets: [makeWidget('trend'), makeWidget('projects')],
        canAdd: true,
        onAdd: fn(),
        onVariantChange: fn(),
        onWidthChange: fn(),
        onMove: fn(),
        onOptionChange: fn(),
        onToggleVisible: fn(),
        onRemove: fn(),
        savedLayouts: [
            makeSavedLayout(1, 'Focus'),
            makeSavedLayout(2, 'Overview'),
        ],
        onSaveLayout: fn(),
        onApplyLayout: fn(),
        onDeleteLayout: fn(),
    },
} satisfies Meta<typeof DashboardEditorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The library of widgets to add. */
export const Library: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', {
                name: 'Add Completion Ratio',
            }),
        ).toBeVisible();
    },
};

export const Full: Story = { args: { canAdd: false } };

/** A picked widget opens its settings: style, width and options. */
export const WidgetSettings: Story = {
    args: { selected: makeWidget('projects') },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('group', { name: 'Width' }),
        ).toBeVisible();
    },
};

export const NothingPicked: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Settings' }),
        );
    },
};

/** Layouts kept under a name, to put on the dashboard again. */
export const SavedLayouts: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Saved' }),
        );
        await expect(
            within(canvasElement).getByRole('button', { name: 'Apply Focus' }),
        ).toBeVisible();
    },
};
