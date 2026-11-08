import { DragEndEvent } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DASHBOARD_CATALOG, makeWidget } from '@/tests/dashboardLayout';
import DashboardGrid from './DashboardGrid';

const dnd = vi.hoisted(() => ({
    onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}));

vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dnd-kit/core')>();

    return {
        ...actual,
        DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
            dnd.onDragEnd = props.onDragEnd;

            return <actual.DndContext {...props} />;
        },
    };
});

vi.mock('@/Components/Organisms/DashboardWidget/DashboardWidget', () => ({
    default: ({ widget }: { widget: { id: string } }) => (
        <div data-testid="widget">{widget.id}</div>
    ),
}));

const widgets = [
    makeWidget('stat_projects'),
    makeWidget('stat_critical', { visible: false }),
    makeWidget('trend'),
];

const data = { projects: [] };

beforeEach(() => {
    dnd.onDragEnd = undefined;
});

describe('DashboardGrid', () => {
    test('draws the visible widgets on the grid when not editing', () => {
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
            />,
        );

        expect(
            screen.getAllByTestId('widget').map((el) => el.textContent),
        ).toEqual(['stat_projects', 'trend']);
        expect(
            screen.queryByTestId('widget-edit-frame'),
        ).not.toBeInTheDocument();
    });

    test('gives each widget the columns of its width', () => {
        const { container } = render(
            <DashboardGrid
                widgets={[makeWidget('trend', { span: 12 })]}
                catalog={DASHBOARD_CATALOG}
                data={data}
            />,
        );

        expect(container.querySelector('.col-span-12')).toBeInTheDocument();
    });

    test('while editing every widget is framed, hidden ones too', () => {
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
                editing
            />,
        );

        expect(screen.getAllByTestId('widget-edit-frame')).toHaveLength(3);
        expect(screen.getByText('Critical Tasks')).toBeInTheDocument();
        expect(
            screen.getByText(/Hidden, it will not appear/),
        ).toBeInTheDocument();
    });

    test('marks the selected widget and reports a click on one', () => {
        const onSelect = vi.fn();
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
                editing
                selectedId="trend"
                onSelect={onSelect}
            />,
        );

        const frames = screen.getAllByTestId('widget-edit-frame');
        expect(frames[2]).toHaveClass('outline-[var(--accent-color)]');

        frames[0].click();
        expect(onSelect).toHaveBeenCalledWith('stat_projects');
    });

    test('dropping a widget on another reorders them', () => {
        const onReorder = vi.fn();
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
                editing
                onReorder={onReorder}
            />,
        );

        dnd.onDragEnd!({
            active: { id: 'stat_projects' },
            over: { id: 'trend' },
        } as unknown as DragEndEvent);

        expect(onReorder).toHaveBeenCalledWith('stat_projects', 'trend');
    });

    test('a drop outside any widget or on itself changes nothing', () => {
        const onReorder = vi.fn();
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
                editing
                onReorder={onReorder}
            />,
        );

        dnd.onDragEnd!({
            active: { id: 'trend' },
            over: null,
        } as unknown as DragEndEvent);
        dnd.onDragEnd!({
            active: { id: 'trend' },
            over: { id: 'trend' },
        } as unknown as DragEndEvent);

        expect(onReorder).not.toHaveBeenCalled();
    });

    test('the buttons of a frame move and hide through the handlers', () => {
        const onMove = vi.fn();
        const onToggleVisible = vi.fn();
        render(
            <DashboardGrid
                widgets={widgets}
                catalog={DASHBOARD_CATALOG}
                data={data}
                editing
                onMove={onMove}
                onToggleVisible={onToggleVisible}
            />,
        );

        screen
            .getByRole('button', { name: 'Move Productivity Trend up' })
            .click();
        screen.getByRole('button', { name: 'Hide Active Projects' }).click();

        expect(onMove).toHaveBeenCalledWith('trend', -1);
        expect(onToggleVisible).toHaveBeenCalledWith('stat_projects');
    });
});
