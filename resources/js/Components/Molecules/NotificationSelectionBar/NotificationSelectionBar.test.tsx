import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import NotificationSelectionBar from './NotificationSelectionBar';

const setup = (selectedCount: number, totalCount = 4) => {
    const handlers = {
        onToggleAll: vi.fn(),
        onMarkAsRead: vi.fn(),
        onDelete: vi.fn(),
        onCancel: vi.fn(),
    };
    render(
        <NotificationSelectionBar
            selectedCount={selectedCount}
            totalCount={totalCount}
            {...handlers}
        />,
    );
    return handlers;
};

describe('NotificationSelectionBar Component', () => {
    test('disables the bulk actions until something is selected', () => {
        setup(0);

        expect(screen.getByText('0 selected')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /mark read/i }),
        ).toBeDisabled();
        expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    test('runs the bulk actions on the selection', async () => {
        const user = userEvent.setup();
        const handlers = setup(2);

        await user.click(screen.getByRole('button', { name: /mark read/i }));
        await user.click(screen.getByRole('button', { name: /delete/i }));
        await user.click(screen.getByLabelText('Cancel selection'));

        expect(handlers.onMarkAsRead).toHaveBeenCalledTimes(1);
        expect(handlers.onDelete).toHaveBeenCalledTimes(1);
        expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    });

    test('toggles between select all and clear selection', async () => {
        const user = userEvent.setup();
        const handlers = setup(4, 4);

        await user.click(screen.getByText('Clear selection'));

        expect(handlers.onToggleAll).toHaveBeenCalledTimes(1);
    });

    test('offers select all while only part of the list is selected', () => {
        setup(1, 4);

        expect(screen.getByText('Select all')).toBeInTheDocument();
    });

    test('cannot select all in an empty list', () => {
        setup(0, 0);

        expect(screen.getByText('Select all')).toBeDisabled();
    });
});
