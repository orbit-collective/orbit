import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WidgetEditFrame from './WidgetEditFrame';

const setup = (
    props: Partial<React.ComponentProps<typeof WidgetEditFrame>> = {},
) => {
    const handlers = {
        onSelect: vi.fn(),
        onMove: vi.fn(),
        onToggleVisible: vi.fn(),
    };
    render(
        <DndContext>
            <WidgetEditFrame
                id="w1"
                label="Trend"
                hidden={false}
                selected={false}
                canMoveUp
                canMoveDown
                {...handlers}
                {...props}
            >
                <p>content</p>
            </WidgetEditFrame>
        </DndContext>,
    );

    return handlers;
};

describe('WidgetEditFrame', () => {
    test('shows the widget under a toolbar with its name and a drag handle', () => {
        setup();

        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.getByText('Trend')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Drag Trend' }),
        ).toBeInTheDocument();
    });

    test('the widget itself cannot be used while editing', () => {
        setup();

        expect(screen.getByText('content').parentElement).toHaveClass(
            'pointer-events-none',
        );
    });

    test('selects on a click and moves with the buttons without selecting', async () => {
        const { onSelect, onMove } = setup();

        await userEvent.click(
            screen.getByRole('button', { name: 'Move Trend up' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Move Trend down' }),
        );
        expect(onMove).toHaveBeenNthCalledWith(1, -1);
        expect(onMove).toHaveBeenNthCalledWith(2, 1);
        expect(onSelect).not.toHaveBeenCalled();

        await userEvent.click(screen.getByText('content'));
        expect(onSelect).toHaveBeenCalledOnce();
    });

    test('cannot move past the ends', () => {
        setup({ canMoveUp: false, canMoveDown: false });

        expect(
            screen.getByRole('button', { name: 'Move Trend up' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Move Trend down' }),
        ).toBeDisabled();
    });

    test('toggles visibility', async () => {
        const { onToggleVisible } = setup();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Trend' }),
        );

        expect(onToggleVisible).toHaveBeenCalledOnce();
    });

    test('a hidden widget shows a stand-in instead of its content', () => {
        setup({ hidden: true });

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

        expect(screen.getByTestId('widget-edit-frame')).toHaveClass(
            'outline-[var(--accent-color)]',
        );
    });
});
