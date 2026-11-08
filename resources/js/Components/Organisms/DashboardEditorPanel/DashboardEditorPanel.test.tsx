import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DASHBOARD_CATALOG, makeWidget } from '@/tests/dashboardLayout';
import { DashboardWidget } from '@/types/Dashboard';
import DashboardEditorPanel from './DashboardEditorPanel';

const setup = (
    selected?: DashboardWidget,
    props: Partial<React.ComponentProps<typeof DashboardEditorPanel>> = {},
) => {
    const handlers = {
        onAdd: vi.fn(),
        onVariantChange: vi.fn(),
        onSpanChange: vi.fn(),
        onOptionChange: vi.fn(),
        onToggleVisible: vi.fn(),
        onRemove: vi.fn(),
    };
    const view = render(
        <DashboardEditorPanel
            catalog={DASHBOARD_CATALOG}
            selected={selected}
            canAdd
            {...handlers}
            {...props}
        />,
    );

    return { ...handlers, ...view };
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

    test('stops adding when the dashboard is full', () => {
        setup(undefined, { canAdd: false });

        screen
            .getAllByRole('button', { name: /^Add / })
            .forEach((button) => expect(button).toBeDisabled());
    });

    test('asks to pick a widget when none is selected', async () => {
        setup();

        await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));

        expect(
            screen.getByText(/Pick a widget on the dashboard/),
        ).toBeInTheDocument();
    });

    test('opens the settings of a widget once it is selected', () => {
        setup(makeWidget('projects'));

        expect(
            screen.getByRole('tab', { name: 'Settings', selected: true }),
        ).toBeInTheDocument();
        expect(screen.getByText('Projects Directory')).toBeInTheDocument();
    });

    test('changes the style, the width and the options', async () => {
        const { onVariantChange, onSpanChange, onOptionChange } = setup(
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
        expect(onSpanChange).toHaveBeenCalledWith('projects', 6);
        expect(onOptionChange).toHaveBeenCalledWith('projects', 'limit', 5);
    });

    test('marks the current choice as pressed', () => {
        setup(makeWidget('projects', { span: 12, config: { limit: 10 } }));

        expect(screen.getByRole('button', { name: 'Full' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '10' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '3' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
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

    test('hides, shows and removes the selected widget', async () => {
        const { onToggleVisible, onRemove, rerender } = setup(
            makeWidget('trend'),
        );

        await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
        await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(onToggleVisible).toHaveBeenCalledWith('trend');
        expect(onRemove).toHaveBeenCalledWith('trend');

        rerender(
            <DashboardEditorPanel
                catalog={DASHBOARD_CATALOG}
                selected={makeWidget('trend', { visible: false })}
                canAdd
                onAdd={vi.fn()}
                onVariantChange={vi.fn()}
                onSpanChange={vi.fn()}
                onOptionChange={vi.fn()}
                onToggleVisible={vi.fn()}
                onRemove={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Show' }),
        ).toBeInTheDocument();
    });
});
