import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DASHBOARD_CATALOG, makeWidget } from '@/tests/dashboardLayout';
import { DashboardWidget } from '@/types/Dashboard';
import DashboardEditorPanel from './DashboardEditorPanel';

const handlers = () => ({
    onAdd: vi.fn(),
    onVariantChange: vi.fn(),
    onWidthChange: vi.fn(),
    onOptionChange: vi.fn(),
    onToggleVisible: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
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

        setup(makeWidget('stat_projects'));
    });

    test('has no style choice for a widget with a single style', () => {
        setup(makeWidget('trend'));

        expect(
            screen.queryByRole('group', { name: 'Style' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('group', { name: 'Width' }),
        ).toBeInTheDocument();
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
});
