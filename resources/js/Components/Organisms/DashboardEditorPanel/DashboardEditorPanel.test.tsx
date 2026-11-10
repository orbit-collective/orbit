import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import {
    DASHBOARD_CATALOG,
    makeSavedLayout,
    makeWidget,
    makeStat,
} from '@/tests/dashboardLayout';
import { DashboardSavedLayout, DashboardWidget } from '@/types/Dashboard';
import DashboardEditorPanel from './DashboardEditorPanel';

const handlers = () => ({
    onAdd: vi.fn(),
    onVariantChange: vi.fn(),
    onWidthChange: vi.fn(),
    onOptionChange: vi.fn(),
    onToggleVisible: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    savedLayouts: [] as DashboardSavedLayout[],
    onSaveLayout: vi.fn(),
    onApplyLayout: vi.fn(),
    onRenameLayout: vi.fn(),
    onOverwriteLayout: vi.fn(),
    onDeleteLayout: vi.fn(),
});

const setup = (
    selected?: DashboardWidget,
    props: Partial<React.ComponentProps<typeof DashboardEditorPanel>> = {},
) => {
    const fns = handlers();
    const view = render(
        <DashboardEditorPanel
            catalog={DASHBOARD_CATALOG}
            widgets={selected ? [selected] : []}
            selected={selected}
            canAdd
            {...fns}
            {...props}
        />,
    );

    return { ...fns, ...view };
};

describe('DashboardEditorPanel', () => {
    test('lists every widget type of the catalog to add', async () => {
        const { onAdd } = setup();

        expect(screen.getAllByRole('listitem')).toHaveLength(
            DASHBOARD_CATALOG.length,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Add Completion Ratio' }),
        );

        expect(onAdd).toHaveBeenCalledWith('completion');
    });

    test('counts what is already on the dashboard', () => {
        setup(undefined, {
            widgets: [
                makeWidget('trend', { id: 'a' }),
                makeWidget('trend', { id: 'b' }),
            ],
        });

        expect(
            screen.getByRole('button', { name: 'Add Productivity Trend' }),
        ).toHaveTextContent('×2');
        expect(
            screen.getByRole('button', { name: 'Add Completion Ratio' }),
        ).not.toHaveTextContent('×');
    });

    test('stops adding when the dashboard is full', () => {
        setup(undefined, { canAdd: false });

        screen
            .getAllByRole('button', { name: /^Add / })
            .forEach((button) => expect(button).toBeDisabled());
    });

    test('asks to pick a widget when none is selected', async () => {
        setup();

        await userEvent.click(screen.getByRole('button', { name: 'Settings' }));

        expect(screen.getByText('Pick a widget')).toBeInTheDocument();
    });

    test('opens the settings of a widget once it is selected', () => {
        setup(makeWidget('projects'));

        expect(
            screen.getByRole('button', { name: 'Settings' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Projects Directory')).toBeInTheDocument();
    });

    test('changes the style, the width and the options', async () => {
        const { onVariantChange, onWidthChange, onOptionChange } = setup(
            makeWidget('projects'),
        );

        const group = (label: string) =>
            screen.getByRole('group', { name: label });

        await userEvent.click(
            within(group('Style')).getByRole('button', { name: 'Compact' }),
        );
        await userEvent.click(
            within(group('Width')).getByRole('button', { name: '1/2' }),
        );
        await userEvent.click(
            within(group('Projects shown')).getByRole('button', { name: '5' }),
        );

        expect(onVariantChange).toHaveBeenCalledWith('projects', 'compact');
        expect(onWidthChange).toHaveBeenCalledWith('projects', 60);
        expect(onOptionChange).toHaveBeenCalledWith('projects', 'limit', 5);
    });

    test('shows the size and marks the current width', () => {
        setup(
            makeWidget('projects', {
                width: 120,
                height: 100,
                config: { limit: 10 },
            }),
        );

        expect(screen.getByRole('button', { name: 'Full' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '10' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByText(/100% wide · 400px tall/)).toBeInTheDocument();
    });

    test('offers only the widths the widget is wide enough for', () => {
        setup(makeWidget('trend'));

        expect(screen.getByRole('button', { name: '1/4' })).toBeInTheDocument();

        setup(makeStat('projects'));
    });

    test('has no style choice for a widget with a single style', () => {
        setup(makeWidget('trend'), {
            catalog: DASHBOARD_CATALOG.map((item) =>
                item.type === 'trend' ? { ...item, variants: ['bars'] } : item,
            ),
        });

        expect(
            screen.queryByRole('group', { name: 'Style' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('group', { name: 'Width' }),
        ).toBeInTheDocument();
    });

    test('names option values with their labels, or capitalises them', () => {
        setup(makeStat('open_issues'));

        const count = screen.getByRole('group', { name: 'Count' });
        expect(
            within(count).getByRole('button', { name: 'In progress' }),
        ).toBeInTheDocument();

        const color = screen.getByRole('group', { name: 'Color' });
        expect(
            within(color).getByRole('button', { name: 'Success' }),
        ).toBeInTheDocument();

        const icon = screen.getByRole('group', { name: 'Icon' });
        expect(
            within(icon).getByRole('button', { name: 'Hide' }),
        ).toBeInTheDocument();
    });

    test('a statistic shows only the options that fit what it counts', () => {
        setup(makeStat('open_issues'));

        expect(
            screen.getByRole('group', { name: 'Count' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'As' })).toBeInTheDocument();
    });

    test('a statistic of projects has no count or format, as nothing is a part of the projects', () => {
        setup(makeStat('projects'));

        expect(
            screen.getByRole('group', { name: 'Shows' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: 'Count' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: 'As' }),
        ).not.toBeInTheDocument();
    });

    test('a statistic is named by the number it shows, and its color can be automatic', () => {
        setup(makeStat('overdue'));

        expect(
            screen.getByRole('heading', { name: 'Overdue Issues' }),
        ).toBeInTheDocument();
        expect(
            within(screen.getByRole('group', { name: 'Color' })).getByRole(
                'button',
                { name: 'Automatic' },
            ),
        ).toBeInTheDocument();
    });

    test('changes an option that shows or hides a part of the widget', async () => {
        const { onOptionChange } = setup(makeWidget('trend'));

        await userEvent.click(
            within(screen.getByRole('group', { name: 'Grid lines' })).getByRole(
                'button',
                { name: 'Hide' },
            ),
        );

        expect(onOptionChange).toHaveBeenCalledWith('trend', 'grid', 'off');
    });

    test('moves the selected widget earlier and later', async () => {
        const { onMove } = setup(makeWidget('trend', { id: 'b' }), {
            widgets: [
                makeWidget('trend', { id: 'a' }),
                makeWidget('trend', { id: 'b' }),
                makeWidget('trend', { id: 'c' }),
            ],
        });

        await userEvent.click(screen.getByRole('button', { name: 'Earlier' }));
        await userEvent.click(screen.getByRole('button', { name: 'Later' }));

        expect(onMove).toHaveBeenNthCalledWith(1, 'b', -1);
        expect(onMove).toHaveBeenNthCalledWith(2, 'b', 1);
    });

    test('the first widget cannot go earlier, the last cannot go later', () => {
        setup(makeWidget('trend', { id: 'a' }), {
            widgets: [makeWidget('trend', { id: 'a' })],
        });

        expect(screen.getByRole('button', { name: 'Earlier' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Later' })).toBeDisabled();
    });

    test('shows, hides and removes the selected widget', async () => {
        const { onToggleVisible, onRemove } = setup(makeWidget('trend'));

        const toggle = screen.getByRole('switch', {
            name: 'Show on dashboard',
        });
        expect(toggle).toBeChecked();

        await userEvent.click(toggle);
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove widget' }),
        );

        expect(onToggleVisible).toHaveBeenCalledWith('trend');
        expect(onRemove).toHaveBeenCalledWith('trend');
    });

    test('a hidden widget has its switch off', () => {
        setup(makeWidget('trend', { visible: false }));

        expect(
            screen.getByRole('switch', { name: 'Show on dashboard' }),
        ).not.toBeChecked();
    });

    test('has a Saved tab with the saved layouts', async () => {
        const { onApplyLayout } = setup(undefined, {
            savedLayouts: [makeSavedLayout(7, 'Focus')],
        });

        await userEvent.click(screen.getByRole('button', { name: 'Saved' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Apply Focus' }),
        );

        expect(onApplyLayout).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, name: 'Focus' }),
        );
    });

    test('passes saving and deleting of layouts on', async () => {
        const { onSaveLayout, onDeleteLayout } = setup(undefined, {
            savedLayouts: [makeSavedLayout(7, 'Focus')],
            saveLayoutError: 'Too many layouts.',
        });

        await userEvent.click(screen.getByRole('button', { name: 'Saved' }));
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Too many layouts.',
        );

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSaveLayout).toHaveBeenCalledWith('Wide');

        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Focus' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm deleting Focus' }),
        );
        expect(onDeleteLayout).toHaveBeenCalledWith(7);
    });

    test('a choice of colors is swatches, not text', async () => {
        const { onOptionChange } = setup(
            makeStat('critical', { config: { color: 'error' } }),
        );

        const group = screen.getByRole('group', { name: 'Color' });
        const swatch = within(group).getByRole('button', { name: 'Success' });
        expect(swatch).toHaveStyle({ backgroundColor: 'var(--success-color)' });
        expect(swatch).toHaveTextContent('');
        expect(
            within(group).getByRole('button', { name: 'Error' }),
        ).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(swatch);

        expect(onOptionChange).toHaveBeenCalledWith(
            'stat_critical',
            'color',
            'success',
        );
    });

    test('adding a widget confirms with a check for a moment', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { container, onAdd } = setup();
        const button = screen.getByRole('button', {
            name: 'Add Completion Ratio',
        });

        expect(button.querySelector('.lucide-check')).toBeNull();

        await userEvent.click(button);
        expect(onAdd).toHaveBeenCalledWith('completion');
        expect(button.querySelector('.lucide-check')).not.toBeNull();
        expect(container.querySelectorAll('.lucide-check')).toHaveLength(1);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });
        expect(button.querySelector('.lucide-check')).toBeNull();

        vi.useRealTimers();
    });

    test('the count of a widget type is shown on its row and follows the dashboard', () => {
        const { rerender } = setup(undefined, {
            widgets: [makeWidget('trend', { id: 'a' })],
        });
        const row = () =>
            screen.getByRole('button', { name: 'Add Productivity Trend' });
        expect(row()).toHaveTextContent('×1');

        rerender(
            <DashboardEditorPanel
                catalog={DASHBOARD_CATALOG}
                widgets={[
                    makeWidget('trend', { id: 'a' }),
                    makeWidget('trend', { id: 'b' }),
                ]}
                canAdd
                {...handlers()}
            />,
        );
        expect(row()).toHaveTextContent('×2');
    });

    test('moving between tabs brings the content in from the side of the pick', async () => {
        setup(undefined, { savedLayouts: [makeSavedLayout(1, 'Focus')] });

        // Forward: the widgets tab to the saved one.
        await userEvent.click(screen.getByRole('button', { name: 'Saved' }));
        expect(screen.getByText('Save this layout as')).toBeInTheDocument();

        // And back again.
        await userEvent.click(screen.getByRole('button', { name: 'Widgets' }));
        expect(screen.getByText('Add to dashboard')).toBeInTheDocument();
    });

    test('the tab that is picked sits on the sliding pill', async () => {
        setup();

        await userEvent.click(screen.getByRole('button', { name: 'Settings' }));

        const pills = screen
            .getAllByTestId('segment-pill')
            .filter((pill) => pill.closest('[aria-label="Panel"]'));
        expect(pills).toHaveLength(1);
        expect(
            screen.getByRole('button', { name: 'Settings' }),
        ).toContainElement(pills[0]);
    });

    test('the remove button is tinted red with mixed colors, not with an opacity Tailwind 3 drops', () => {
        setup(makeWidget('trend'));

        const button = screen.getByRole('button', { name: 'Remove widget' });

        expect(button.className).toContain(
            'color-mix(in_srgb,var(--error-color)',
        );
        expect(button.className).not.toMatch(/\]\/\d+/);
        expect(button).toHaveClass('text-(--error-color)');
        expect(button.querySelector('svg')).not.toBeNull();
    });
});
