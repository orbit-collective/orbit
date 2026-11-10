import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { makeWidget } from '@/tests/dashboardLayout';
import WidgetEditFrame from './WidgetEditFrame';

/** The sensors the dashboard grid uses, so a plain click stays a click. */
const Sensors = ({ children }: { children: React.ReactNode }) => {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    );

    return <DndContext sensors={sensors}>{children}</DndContext>;
};

const setup = (
    props: Partial<React.ComponentProps<typeof WidgetEditFrame>> = {},
) => {
    const handlers = {
        onSelect: vi.fn(),
        onToggleVisible: vi.fn(),
        onResize: vi.fn(),
    };
    render(
        <Sensors>
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
        </Sensors>,
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
    test('shows the widget with a tag with its name and size', () => {
        setup();

        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.getByText('Trend')).toBeInTheDocument();
        expect(screen.getByTestId('widget-size')).toHaveTextContent(
            '50% · 320px',
        );
    });

    test('the whole widget is what a drag starts from', () => {
        setup();

        const surface = screen.getByTestId('widget-drag-surface');
        expect(surface).toHaveClass('cursor-grab', 'absolute', 'inset-0');
        // The tag and the handles lie beside it, so they are not controls nested in a control.
        expect(surface).not.toContainElement(screen.getByText('Trend'));
        expect(surface).not.toContainElement(screen.getByTestId('resize-size'));
        expect(surface).not.toContainElement(
            screen.getByRole('button', { name: 'Hide Trend' }),
        );
    });

    test('draws the widget itself untouched, under the editing layer', () => {
        setup();

        const content = screen.getByText('content');
        expect(content.parentElement).not.toHaveClass('pointer-events-none');
        expect(
            content.parentElement!.compareDocumentPosition(
                screen.getByTestId('widget-drag-surface'),
            ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    test('selects on a click', async () => {
        const { onSelect } = setup();

        await userEvent.click(screen.getByTestId('widget-drag-surface'));

        expect(onSelect).toHaveBeenCalledOnce();
    });

    test('toggles visibility without selecting', async () => {
        const { onToggleVisible, onSelect } = setup();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Trend' }),
        );

        expect(onToggleVisible).toHaveBeenCalledOnce();
        expect(onSelect).not.toHaveBeenCalled();
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

        expect(screen.getByTestId('widget-drag-surface')).toHaveClass(
            'outline-(--accent-color)',
        );
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

    test('a ring spreads from a widget that is picked, and only from that one', () => {
        const { unmount } = render(
            <Sensors>
                <WidgetEditFrame
                    widget={makeWidget('trend')}
                    label="Trend"
                    icon="ChartLine"
                    minWidth={30}
                    minHeight={56}
                    snap
                    selected
                    onSelect={vi.fn()}
                    onToggleVisible={vi.fn()}
                    onResize={vi.fn()}
                >
                    <p>content</p>
                </WidgetEditFrame>
            </Sensors>,
        );
        expect(screen.getByTestId('selection-ping')).toBeInTheDocument();
        unmount();

        setup({ selected: false });
        expect(screen.queryByTestId('selection-ping')).not.toBeInTheDocument();
    });

    test('a new style draws the widget again', () => {
        const props = {
            label: 'Trend',
            icon: 'ChartLine' as const,
            minWidth: 30,
            minHeight: 56,
            snap: true,
            selected: false,
            onSelect: vi.fn(),
            onToggleVisible: vi.fn(),
            onResize: vi.fn(),
        };
        const view = (variant: string) => (
            <Sensors>
                <WidgetEditFrame
                    {...props}
                    widget={makeWidget('trend', { variant })}
                >
                    <p>content</p>
                </WidgetEditFrame>
            </Sensors>
        );
        const { rerender } = render(view('bars'));
        const before = screen.getByText('content');

        rerender(view('bars'));
        expect(screen.getByText('content')).toBe(before);

        rerender(view('line'));
        expect(screen.getByText('content')).not.toBe(before);
    });

    describe('for a keyboard and for touch', () => {
        test('the surface is a focusable button that says whether the widget is picked', () => {
            setup({ selected: true });

            const surface = screen.getByRole('button', {
                name: 'Trend, widget',
            });
            expect(surface).toHaveAttribute('tabindex', '0');
            expect(surface).toHaveAttribute('aria-pressed', 'true');
        });

        test('is not pressed while the widget is not picked', () => {
            setup({ selected: false });

            expect(
                screen.getByRole('button', { name: 'Trend, widget' }),
            ).toHaveAttribute('aria-pressed', 'false');
        });

        test.each([['{Enter}'], [' ']])(
            'picks the widget with the %j key',
            async (key) => {
                const { onSelect } = setup();

                screen.getByRole('button', { name: 'Trend, widget' }).focus();
                await userEvent.keyboard(key);

                expect(onSelect).toHaveBeenCalledOnce();
            },
        );

        test('other keys do not pick it', async () => {
            const { onSelect } = setup();

            screen.getByRole('button', { name: 'Trend, widget' }).focus();
            await userEvent.keyboard('a{Tab}');

            expect(onSelect).not.toHaveBeenCalled();
        });

        test('a swipe over the widget can still scroll the page', () => {
            setup();

            const surface = screen.getByTestId('widget-drag-surface');
            expect(surface).toHaveClass('touch-pan-y');
            expect(surface).not.toHaveClass('touch-none');
        });

        test('the small handles do not scroll, so a resize is not taken for a swipe', () => {
            setup();

            expect(screen.getByTestId('resize-size')).toHaveClass('touch-none');
        });
    });

    describe('on a narrow screen', () => {
        afterEach(() => {
            vi.unstubAllGlobals();
        });

        test('the corner only changes the height, as widgets are full width there', () => {
            vi.stubGlobal(
                'matchMedia',
                vi.fn().mockReturnValue({ matches: false }),
            );
            const { onResize } = setup({ snap: false });

            dragHandle('resize-size', { x: 0, y: 0 }, { x: 30, y: 12 });

            expect(onResize).toHaveBeenLastCalledWith({
                width: 60,
                height: 83,
            });
        });

        test('the corner changes both on a wide screen', () => {
            vi.stubGlobal(
                'matchMedia',
                vi.fn().mockReturnValue({ matches: true }),
            );
            const { onResize } = setup({ snap: false });

            dragHandle('resize-size', { x: 0, y: 0 }, { x: 30, y: 12 });

            expect(onResize).toHaveBeenLastCalledWith({
                width: 90,
                height: 83,
            });
        });
    });

    test('dragging one edge leaves the other dimension as it was, even when it is not on the grid', () => {
        const { onResize } = setup({
            widget: makeWidget('trend', { width: 77, height: 83 }),
        });

        dragHandle('resize-width', { x: 0, y: 0 }, { x: 10, y: 99 });
        expect(onResize).toHaveBeenLastCalledWith({ width: 90, height: 83 });

        dragHandle('resize-height', { x: 0, y: 0 }, { x: 99, y: 40 });
        expect(onResize).toHaveBeenLastCalledWith({ width: 77, height: 90 });
    });
});
