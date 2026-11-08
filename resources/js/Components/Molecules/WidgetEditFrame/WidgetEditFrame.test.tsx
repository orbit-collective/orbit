import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { makeWidget } from '@/tests/dashboardLayout';
import WidgetEditFrame from './WidgetEditFrame';

const setup = (
    props: Partial<React.ComponentProps<typeof WidgetEditFrame>> = {},
) => {
    const handlers = {
        onSelect: vi.fn(),
        onToggleVisible: vi.fn(),
        onResize: vi.fn(),
    };
    render(
        <DndContext>
            <div>
                <WidgetEditFrame
                    widget={makeWidget('trend', { width: 60, height: 80 })}
                    label="Trend"
                    icon="ChartLine"
                    minWidth={30}
                    minHeight={56}
                    snap
                    selected={false}
                    {...handlers}
                    {...props}
                >
                    <p>content</p>
                </WidgetEditFrame>
            </div>
        </DndContext>,
    );

    return handlers;
};

/** jsdom has no layout: the 120 columns of the grid are 1px each. */
const dragHandle = (
    testId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
) => {
    const handle = screen.getByTestId(testId);
    fireEvent.pointerDown(handle, {
        clientX: from.x,
        clientY: from.y,
        pointerId: 1,
    });
    fireEvent.pointerMove(handle, {
        clientX: to.x,
        clientY: to.y,
        pointerId: 1,
    });
    fireEvent.pointerUp(handle, { pointerId: 1 });
};

describe('WidgetEditFrame', () => {
    test('shows the widget under a header with its name and size', () => {
        setup();

        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.getByText('Trend')).toBeInTheDocument();
        expect(screen.getByTestId('widget-size')).toHaveTextContent(
            '50% · 320px',
        );
    });

    test('the whole header is what a drag starts from', () => {
        setup();

        const header = screen.getByTestId('widget-drag-header');
        expect(header).toHaveClass('cursor-grab');
        expect(header).toContainElement(screen.getByText('Trend'));
    });

    test('the widget itself cannot be used while editing', () => {
        setup();

        expect(screen.getByText('content').parentElement).toHaveClass(
            'pointer-events-none',
        );
    });

    test('selects on a click', async () => {
        const { onSelect } = setup();

        await userEvent.click(screen.getByText('content'));

        expect(onSelect).toHaveBeenCalledOnce();
    });

    test('toggles visibility without selecting', async () => {
        const { onToggleVisible, onSelect } = setup();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Trend' }),
        );

        expect(onToggleVisible).toHaveBeenCalledOnce();
        expect(onSelect).toHaveBeenCalledOnce();
    });

    test('a hidden widget shows a stand-in instead of its content', () => {
        setup({ widget: makeWidget('trend', { visible: false }) });

        expect(screen.queryByText('content')).not.toBeInTheDocument();
        expect(
            screen.getByText(/Hidden, it will not appear/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Show Trend' }),
        ).toBeInTheDocument();
    });

    test('outlines the selected widget', () => {
        setup({ selected: true });

        expect(
            screen.getByText('Trend').closest('[class*="border-"]'),
        ).toBeTruthy();
        expect(
            screen.getByTestId('widget-edit-frame').firstElementChild,
        ).toHaveClass('border-[var(--accent-color)]');
    });

    test('dragging the right edge resizes the width, snapped to a twelfth', () => {
        const { onResize } = setup();

        dragHandle('resize-width', { x: 0, y: 0 }, { x: 14, y: 90 });

        // 60 + 14 columns snaps to 70, the height is untouched.
        expect(onResize).toHaveBeenLastCalledWith({ width: 70, height: 80 });
    });

    test('dragging the bottom edge resizes the height', () => {
        const { onResize } = setup();

        dragHandle('resize-height', { x: 0, y: 0 }, { x: 50, y: 160 });

        // 160px is 40 rows: 80 + 40 = 120.
        expect(onResize).toHaveBeenLastCalledWith({ width: 60, height: 120 });
    });

    test('the corner resizes both ways, and without snap by single units', () => {
        const { onResize } = setup({ snap: false });

        dragHandle('resize-size', { x: 0, y: 0 }, { x: 7, y: 12 });

        expect(onResize).toHaveBeenLastCalledWith({ width: 67, height: 83 });
    });

    test('resizing stops at the minimum of the widget', () => {
        const { onResize } = setup();

        dragHandle('resize-size', { x: 0, y: 0 }, { x: -900, y: -9000 });

        expect(onResize).toHaveBeenLastCalledWith({ width: 30, height: 56 });
    });

    test('resizing does not select the widget and ends on release', () => {
        const { onResize, onSelect } = setup();
        const handle = screen.getByTestId('resize-width');

        fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
        fireEvent.pointerUp(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, {
            clientX: 50,
            clientY: 0,
            pointerId: 1,
        });
        fireEvent.click(handle);

        expect(onResize).not.toHaveBeenCalled();
        expect(onSelect).not.toHaveBeenCalled();
    });
});
